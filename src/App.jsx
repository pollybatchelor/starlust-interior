import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ClipboardList, 
  CheckSquare, 
  Calendar, 
  Plus, 
  Trash2, 
  User, 
  Clock, 
  AlertCircle,
  Menu,
  X,
  RotateCcw,
  Layout,
  Droplet,
  Wifi,
  WifiOff
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';

// --- FIREBASE SETUP ---
// This connects your app to the cloud database
// NOTE: When running inside this preview environment, we use the internal config.
// If you host this elsewhere (like StackBlitz), REPLACE this line with your own keys:
// const firebaseConfig = { apiKey: "...", ... };

const firebaseConfig = {
  apiKey: "AIzaSyB0M1TJrpq5OYSpf4k7Q7Up-j-Tb8XiFzw",
  authDomain: "starlust-interior.firebaseapp.com",
  projectId: "starlust-interior",
  storageBucket: "starlust-interior.firebasestorage.app",
  messagingSenderId: "625041539850",
  appId: "1:625041539850:web:eacd3a626cb8d2117230f3",
  measurementId: "G-YLB8645HXF"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- YOUR SPECIFIC YACHT DATA ---
// EDIT THESE LISTS below to match your vessel's SOPs.
// These will be uploaded to the database the first time you run the app.

const CREW_MEMBERS = ["Chief", "Taz", "Liv", "Afrika", "Lucinda"];

const DEFAULT_ROTATIONS = [
  { 
    id: 'r1', 
    zone: "Crew Mess", 
    assignee: "Sarah", 
    tasks: [
      { id: 'cm1', text: "Empty dishwashers", done: false },
      { id: 'cm2', text: "Wipe down tables & counters", done: true },
      { id: 'cm3', text: "Restock milk & cereal", done: false },
      { id: 'cm4', text: "Vacuum floor", done: false }
    ]
  },
  { 
    id: 'r2', 
    zone: "Laundry", 
    assignee: "Emma", 
    tasks: [
      { id: 'l1', text: "Clean dryer filters", done: false },
      { id: 'l2', text: "Start first load of towels", done: false },
      { id: 'l3', text: "Check detergent levels", done: true },
      { id: 'l4', text: "Wipe down machines", done: false }
    ]
  },
  { 
    id: 'r3', 
    zone: "Bridge & Capt", 
    assignee: "Jessica", 
    tasks: [
      { id: 'bc1', text: "Make Captain's bed", done: false },
      { id: 'bc2', text: "Detail bridge windows (interior)", done: false },
      { id: 'bc3', text: "Empty trash bins", done: false },
      { id: 'bc4', text: "Dust navigation consoles", done: false }
    ]
  },
  { 
    id: 'r4', 
    zone: "Stairs & Day Heads", 
    assignee: "Polly", 
    tasks: [
      { id: 'sd1', text: "Vacuum crew stairs", done: true },
      { id: 'sd2', text: "Wipe banisters", done: false },
      { id: 'sd3', text: "Check toilet paper in day heads", done: false },
      { id: 'sd4', text: "Quick detail mirrors", done: false }
    ]
  }
];

const DEFAULT_WEEKLY_TASKS = [
  { id: 'w1', day: 'Monday', title: "Flush all drains", assignee: "Rotation", done: false },
  { id: 'w2', day: 'Monday', title: "Water plants", assignee: "Rotation", done: false },
  { id: 'w3', day: 'Wednesday', title: "Clean crew fridges", assignee: "Rotation", done: false },
  { id: 'w4', day: 'Friday', title: "Vacuum ceilings / Air Con vents", assignee: "Rotation", done: false },
];

const DEFAULT_MONTHLY_TASKS = [
  { id: 'mo1', title: "Deep clean ovens", assignee: "Unassigned", done: false },
  { id: 'mo2', title: "Wash duvet inners", assignee: "Unassigned", done: false },
  { id: 'mo3', title: "Descale coffee machines", assignee: "Unassigned", done: false },
  { id: 'mo4', title: "Inventory Uniform Cupboard", assignee: "Chief", done: false },
];

const DEFAULT_ADHOC_TASKS = [
  { id: 1, title: "Polish silver in Main Salon", assignee: "Polly", priority: "High", status: "Pending", due: "14:00" },
];

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.blue}`}>
      {children}
    </span>
  );
};

export default function YachtInteriorManager() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data State
  const [rotations, setRotations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [monthlyTasks, setMonthlyTasks] = useState([]);
  
  // Date Helpers
  const today = new Date();
  const isFirstWeek = today.getDate() <= 7;
  const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });

  // --- Firebase Initialization & Auth ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Real-time Data Sync ---
  useEffect(() => {
    if (!user) return;

    // Helper to reference our specific collections
    const getRef = (collectionName) => collection(db, 'artifacts', appId, 'public', 'data', collectionName);

    // 1. ROTATIONS LISTENER
    const unsubRotations = onSnapshot(doc(getRef('lists'), 'rotations'), (docSnap) => {
      if (docSnap.exists()) {
        setRotations(docSnap.data().list || []);
      } else {
        // Seed if empty
        setDoc(doc(getRef('lists'), 'rotations'), { list: DEFAULT_ROTATIONS });
      }
    }, (error) => console.error("Rotations sync error:", error));

    // 2. WEEKLY TASKS LISTENER
    const unsubWeekly = onSnapshot(doc(getRef('lists'), 'weekly'), (docSnap) => {
      if (docSnap.exists()) {
        setWeeklyTasks(docSnap.data().list || []);
      } else {
        setDoc(doc(getRef('lists'), 'weekly'), { list: DEFAULT_WEEKLY_TASKS });
      }
    }, (error) => console.error("Weekly sync error:", error));

    // 3. MONTHLY TASKS LISTENER
    const unsubMonthly = onSnapshot(doc(getRef('lists'), 'monthly'), (docSnap) => {
      if (docSnap.exists()) {
        setMonthlyTasks(docSnap.data().list || []);
      } else {
        setDoc(doc(getRef('lists'), 'monthly'), { list: DEFAULT_MONTHLY_TASKS });
      }
    }, (error) => console.error("Monthly sync error:", error));

    // 4. AD-HOC TASKS LISTENER
    const unsubAdHoc = onSnapshot(doc(getRef('lists'), 'adhoc'), (docSnap) => {
      if (docSnap.exists()) {
        setTasks(docSnap.data().list || []);
      } else {
        setDoc(doc(getRef('lists'), 'adhoc'), { list: DEFAULT_ADHOC_TASKS });
      }
      setLoading(false);
    }, (error) => console.error("AdHoc sync error:", error));

    return () => {
      unsubRotations();
      unsubWeekly();
      unsubMonthly();
      unsubAdHoc();
    };
  }, [user]);

  // --- Database Updaters ---

  const saveToDb = async (collectionId, data) => {
    if (!user) return;
    try {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'lists', collectionId);
      await updateDoc(ref, { list: data });
    } catch (err) {
      console.error("Error saving:", err);
    }
  };

  // --- Handlers ---

  const toggleRotationTask = (rotationId, taskId) => {
    const updated = rotations.map(rot => {
      if (rot.id === rotationId) {
        return {
          ...rot,
          tasks: rot.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
        };
      }
      return rot;
    });
    setRotations(updated); // Optimistic update
    saveToDb('rotations', updated);
  };

  const updateRotationAssignee = (rotationId, newAssignee) => {
    const updated = rotations.map(rot => rot.id === rotationId ? { ...rot, assignee: newAssignee } : rot);
    setRotations(updated);
    saveToDb('rotations', updated);
  };

  const addTask = async (e) => {
    e.preventDefault();
    const title = e.target.taskTitle.value;
    const assignee = e.target.assignee.value;
    if (!title) return;
    
    const newTask = {
      id: Date.now(),
      title,
      assignee: assignee || "Unassigned",
      priority: "Medium",
      status: "Pending",
      due: "End of Day"
    };
    
    const updated = [...tasks, newTask];
    setTasks(updated);
    await saveToDb('adhoc', updated);
    e.target.reset();
  };

  const deleteTask = (id) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    saveToDb('adhoc', updated);
  };

  const toggleTaskStatus = (id) => {
    const updated = tasks.map(t => t.id === id ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t);
    setTasks(updated);
    saveToDb('adhoc', updated);
  };

  const toggleListTask = (listName, currentList, id) => {
    const updated = currentList.map(t => t.id === id ? { ...t, done: !t.done } : t);
    if (listName === 'weekly') {
      setWeeklyTasks(updated);
      saveToDb('weekly', updated);
    } else {
      setMonthlyTasks(updated);
      saveToDb('monthly', updated);
    }
  };

  // --- Views ---

  const DashboardView = () => (
    <div className="space-y-6">
      {/* Date Header */}
      <div className="flex justify-between items-center bg-blue-900 text-white p-6 rounded-xl shadow-lg">
        <div>
          <h2 className="text-2xl font-bold">{currentDay}, {today.toLocaleDateString()}</h2>
          <p className="text-blue-200 text-sm mt-1">Guest Status: <span className="font-bold text-white">ON</span></p>
        </div>
        {isFirstWeek && (
          <div className="bg-blue-800 px-4 py-2 rounded-lg border border-blue-700 flex items-center gap-2">
            <AlertCircle size={20} className="text-yellow-400" />
            <div className="text-right">
              <p className="text-xs text-blue-300 uppercase font-bold">Maintenance Alert</p>
              <p className="font-bold text-sm">First Week of Month</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Rotations Snapshot */}
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <RotateCcw size={18} /> Today's Rotations
            </h3>
            <button onClick={() => setActiveTab('rotations')} className="text-xs text-blue-600 font-medium hover:underline">Manage</button>
          </div>
          <div className="space-y-3">
            {rotations.map(rot => (
              <div key={rot.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {rot.zone.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{rot.zone}</p>
                    <p className="text-xs text-slate-500">
                      {rot.tasks.filter(t => t.done).length}/{rot.tasks.length} tasks done
                    </p>
                  </div>
                </div>
                <Badge color="slate">{rot.assignee}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Ad-Hoc / Night Before Tasks */}
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={18} /> Daily Jobs
            </h3>
            <button onClick={() => setActiveTab('tasks')} className="text-xs text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {tasks.filter(t => t.status !== 'Completed').slice(0, 3).map(task => (
              <div key={task.id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center shadow-sm">
                <div>
                   <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                   <p className="text-xs text-slate-500">{task.assignee}</p>
                </div>
                <Badge color={task.priority === 'High' ? 'red' : 'amber'}>{task.priority}</Badge>
              </div>
            ))}
            {tasks.filter(t => t.status !== 'Completed').length === 0 && (
              <div className="text-center py-4 text-slate-400 text-sm">All daily jobs clear!</div>
            )}
          </div>
        </Card>
      </div>

      {/* Weekly/Monthly Stats Bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Calendar size={20}/></div>
             <div>
               <p className="text-sm font-bold text-slate-700">Weekly Tasks</p>
               <p className="text-xs text-slate-500">{currentDay} List</p>
             </div>
           </div>
           <p className="text-xl font-bold text-emerald-700">
             {weeklyTasks.filter(t => t.day === currentDay && t.done).length} / {weeklyTasks.filter(t => t.day === currentDay).length}
           </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Layout size={20}/></div>
             <div>
               <p className="text-sm font-bold text-slate-700">Monthly</p>
               <p className="text-xs text-slate-500">First Week</p>
             </div>
           </div>
           <p className="text-xl font-bold text-purple-700">
             {monthlyTasks.filter(t => t.done).length} / {monthlyTasks.length}
           </p>
        </div>
      </div>
    </div>
  );

  const RotationsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Morning Rotations</h2>
          <p className="text-slate-500 text-sm">Assign zones and track morning setup.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {rotations.map(rot => (
          <Card key={rot.id} className="overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                {rot.zone}
              </div>
              <select 
                value={rot.assignee}
                onChange={(e) => updateRotationAssignee(rot.id, e.target.value)}
                className="text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
              >
                {CREW_MEMBERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="p-2">
              {rot.tasks.map(task => (
                <label key={task.id} className="flex items-center p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={task.done}
                    onChange={() => toggleRotationTask(rot.id, task.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 mr-3" 
                  />
                  <span className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {task.text}
                  </span>
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const PeriodicTasksView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Periodic Maintenance</h2>
        <p className="text-slate-500 text-sm">Weekly and Monthly deep cleaning schedules.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Weekly List */}
        <Card className="p-5 border-t-4 border-t-emerald-500">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-slate-800">Weekly Tasks</h3>
            <p className="text-xs text-emerald-600 font-medium">Focus: {currentDay}</p>
          </div>
          <div className="space-y-2">
            {weeklyTasks.map(task => (
              <label key={task.id} className={`flex items-start p-3 rounded-lg border transition-all ${task.day === currentDay ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 opacity-60'}`}>
                <input 
                  type="checkbox" 
                  checked={task.done}
                  onChange={() => toggleListTask('weekly', weeklyTasks, task.id)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 mt-1 mr-3" 
                />
                <div className="flex-1">
                  <span className={`text-sm block font-medium ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {task.title}
                  </span>
                  <span className="text-xs text-slate-400 uppercase">{task.day}</span>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* Monthly List */}
        <Card className="p-5 border-t-4 border-t-purple-500">
           <div className="mb-4 flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg text-slate-800">Monthly Tasks</h3>
              <p className="text-xs text-purple-600 font-medium">First Week of Month</p>
            </div>
            {isFirstWeek && <Badge color="purple">DUE NOW</Badge>}
          </div>
          <div className="space-y-2">
            {monthlyTasks.map(task => (
              <label key={task.id} className="flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-all">
                <input 
                  type="checkbox" 
                  checked={task.done}
                  onChange={() => toggleListTask('monthly', monthlyTasks, task.id)}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 mr-3" 
                />
                <span className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {task.title}
                </span>
                <span className="ml-auto text-xs text-slate-400">{task.assignee}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const AdHocTasksView = () => (
    <div className="space-y-6">
       <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ad-Hoc Jobs</h2>
          <p className="text-slate-500 text-sm">"Night Before" lists and one-off assignments.</p>
        </div>
      </div>

      <Card className="p-4 mb-6 bg-slate-50 border-slate-200">
        <form onSubmit={addTask} className="flex gap-3 flex-col md:flex-row">
          <input 
            name="taskTitle"
            type="text" 
            placeholder="Add new job (e.g. Polish Silver)..." 
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select 
            name="assignee"
            className="px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Assign To...</option>
            {CREW_MEMBERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
            <Plus size={18} /> Add
          </button>
        </form>
      </Card>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Who</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map(task => (
              <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className={`text-sm font-medium ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-slate-400">Due: {task.due}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {task.assignee.charAt(0)}
                    </div>
                    <span className="text-sm text-slate-600">{task.assignee}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge color={task.priority === 'High' ? 'red' : task.priority === 'Medium' ? 'amber' : 'green'}>
                    {task.priority}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => toggleTaskStatus(task.id)}
                  >
                     <Badge color={task.status === 'Completed' ? 'slate' : 'blue'}>
                      {task.status}
                    </Badge>
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- Main Layout ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-200 rounded-lg mb-4"></div>
          <p>Connecting to Yacht Server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white p-4 flex justify-between items-center shadow-sm z-20 sticky top-0">
        <div className="flex items-center gap-2 font-bold text-xl text-blue-900">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">S</div>
          Starlust Interior
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-600">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3 font-bold text-xl mb-6">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30">S</div>
          Starlust Interior
        </div>

        <nav className="px-4 space-y-2">
          <button 
            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Layout size={20} /> Dashboard
          </button>
          <button 
            onClick={() => { setActiveTab('rotations'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'rotations' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <RotateCcw size={20} /> Morning Rotations
          </button>
          <button 
            onClick={() => { setActiveTab('tasks'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <CheckSquare size={20} /> Ad-Hoc Jobs
          </button>
           <button 
            onClick={() => { setActiveTab('periodic'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'periodic' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Calendar size={20} /> Periodic (Week/Month)
          </button>
        </nav>

        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800">
           <div className="flex items-center gap-3">
             <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-900 border border-slate-700 flex items-center justify-center text-xs font-bold">
                  CS
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
             </div>
             <div>
               <p className="text-sm font-medium text-white">Chief Stew</p>
               <p className="text-xs text-slate-500">{user ? 'Online' : 'Offline'}</p>
             </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'rotations' && <RotationsView />}
          {activeTab === 'tasks' && <AdHocTasksView />}
          {activeTab === 'periodic' && <PeriodicTasksView />}
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}