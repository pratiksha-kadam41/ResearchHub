import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, BookOpen, Users, ChevronRight, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardFaculty = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Realistic fallback data
  const displayName = user?.name || "Dr. Alistair Vance";
  const displayRole = user?.role || "Faculty";
  const displayInst = user?.institution || "University of Technology";
  const displayEmail = user?.email || "avance@university.edu";

  const mentorshipGroups = [
    { id: 1, student: "Priya Sharma", topic: "IoT Networks", status: "Thesis Review", lastMeeting: "2 days ago" },
    { id: 2, student: "Rahul Desai", topic: "LLM Fine-tuning", status: "Proposal Phase", lastMeeting: "1 week ago" },
    { id: 3, student: "Ananya Patel", topic: "Quantum Cryptography", status: "Data Collection", lastMeeting: "Yesterday" }
  ];

  const publications = [
    { id: 1, title: "Scalable Protocols for Edge Devices", journal: "IEEE Transactions on Networking", year: "2026" },
    { id: 2, title: "Mitigating Bias in Academic LLMs", journal: "ACM Conference on AI Ethics", year: "2025" }
  ];

  return (
    <div className="min-h-screen bg-parchment flex flex-col font-sans text-oxford selection:bg-faculty selection:text-white">
      {/* Top Navigation */}
      <header className="bg-white border-b border-oxford/10 py-4 px-8 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3 text-oxford">
          <BookOpen size={24} strokeWidth={1.5} />
          <h1 className="text-xl font-serif font-bold tracking-tight">ResearchHub</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="font-semibold text-oxford">{displayName}</span>
            <span className="text-faculty font-bold uppercase tracking-wider text-[10px] bg-faculty/10 px-2 py-0.5 rounded-sm ml-2">Faculty</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-slate-muted hover:text-faculty transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>
      
      {/* Faculty Accent Bar */}
      <div className="h-1.5 w-full bg-faculty"></div>
      
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Profile & Metadata Column (Left) */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white border border-oxford/10 rounded-sm p-6 relative overflow-hidden">
            {/* Subtle background accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-faculty/5 rounded-bl-full pointer-events-none"></div>
            
            <h2 className="text-2xl font-serif text-oxford mb-6 leading-tight">
              Welcome back,<br/>
              <span className="text-faculty">{displayName}</span>
            </h2>
            
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-1">Institution</p>
                <p className="font-medium text-oxford">{displayInst}</p>
              </div>
              <div className="w-full h-px bg-oxford/5"></div>
              <div>
                <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-1">Contact</p>
                <p className="font-mono text-slate-muted">{displayEmail}</p>
              </div>
              <div className="w-full h-px bg-oxford/5"></div>
              <div>
                <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-1">Active Mentees</p>
                <p className="font-medium text-oxford text-lg">{mentorshipGroups.length}</p>
              </div>
            </div>
            
            <button className="mt-8 w-full py-2.5 border border-faculty text-faculty font-semibold rounded-sm hover:bg-faculty hover:text-white transition-colors text-sm">
              Update Profile
            </button>
          </section>
        </div>
        
        {/* Main Content Column (Right) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Mentorship Section */}
          <section>
            <div className="flex justify-between items-end mb-4 border-b border-oxford/10 pb-2">
              <h3 className="text-xl font-serif text-oxford">Student Mentorship</h3>
              <button className="text-sm font-semibold text-faculty hover:underline decoration-faculty/30 underline-offset-4">Manage Groups</button>
            </div>
            
            <div className="bg-white border border-oxford/10 rounded-sm overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-3 bg-parchment/50 border-b border-oxford/10 text-xs font-semibold text-slate-muted uppercase tracking-wider">
                <div className="col-span-4">Student & Topic</div>
                <div className="col-span-4 hidden sm:block">Status</div>
                <div className="col-span-3 hidden sm:block">Last Meeting</div>
                <div className="col-span-4 sm:col-span-1 text-right">Action</div>
              </div>
              
              {mentorshipGroups.map(group => (
                <div key={group.id} className="grid grid-cols-12 gap-4 p-4 border-b border-oxford/5 last:border-0 items-center hover:bg-parchment/30 transition-colors group/row cursor-pointer">
                  <div className="col-span-8 sm:col-span-4">
                    <h4 className="font-semibold text-oxford text-sm mb-0.5">{group.student}</h4>
                    <p className="text-xs text-slate-muted font-mono truncate">{group.topic}</p>
                  </div>
                  <div className="col-span-4 hidden sm:block">
                    <span className="text-xs font-medium px-2 py-1 rounded-sm bg-faculty/5 text-faculty border border-faculty/10">
                      {group.status}
                    </span>
                  </div>
                  <div className="col-span-3 hidden sm:block">
                    <p className="text-xs font-mono text-slate-muted">{group.lastMeeting}</p>
                  </div>
                  <div className="col-span-4 sm:col-span-1 flex justify-end">
                    <ChevronRight size={18} className="text-slate-300 group-hover/row:text-faculty transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Publications Section */}
          <section>
            <div className="flex justify-between items-end mb-4 border-b border-oxford/10 pb-2">
              <h3 className="text-xl font-serif text-oxford">Recent Publications</h3>
            </div>
            
            <div className="space-y-3">
              {publications.map(pub => (
                <article key={pub.id} className="bg-white border border-oxford/10 rounded-sm p-4 hover:border-faculty/30 transition-all flex items-start gap-4">
                  <div className="mt-1 text-faculty/70">
                    <Bookmark size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-oxford text-sm mb-1">{pub.title}</h4>
                    <p className="text-xs text-slate-muted">
                      Published in <span className="italic text-oxford/80">{pub.journal}</span>, {pub.year}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};
