import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, Settings, HelpCircle, ArrowRight, Menu, Search, PlusCircle } from 'lucide-react';
import { FaReact, FaVuejs, FaAngular, FaNodeJs, FaJs } from 'react-icons/fa';
import { SiNextdotjs } from 'react-icons/si';
import './Home.css'; // Import the CSS file for animations

export function Home() {
  const [prompt, setPrompt] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [chats, setChats] = useState([]);
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate('/builder', { state: { prompt } });
    }
  };

  const handlePromptClick = (text: string) => {
    setPrompt(text);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const startNewChat = () => {
    const newChat = {
      title: `Chat ${chats.length + 1}`,
      date: new Date().toLocaleString(),
    };
    setChats([newChat, ...chats]);
    console.log('Start New Chat');
  };

  const handleChatClick = (chat) => {
    console.log(`Navigating to ${chat.title}`);
    // Implement navigation to the old chat
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particlesArray: any[] = [];
    const numberOfParticles = 160; // Slightly increased number of particles

    const mouse = {
      x: null,
      y: null,
      radius: 100
    };

    window.addEventListener('mousemove', (event) => {
      mouse.x = event.x;
      mouse.y = event.y;
    });

    class Particle {
      x: number;
      y: number;
      size: number;
      baseX: number;
      baseY: number;
      density: number;
      velocity: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 1;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = Math.random() * 30 + 1;
        this.velocity = Math.random() * 0.5;
      }

      draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      update() {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const maxDistance = mouse.radius;
        const force = (maxDistance - distance) / maxDistance;
        const directionX = forceDirectionX * force * this.density;
        const directionY = forceDirectionY * force * this.density;

        if (distance < mouse.radius) {
          this.x -= directionX;
          this.y -= directionY;
        } else {
          if (this.x !== this.baseX) {
            const dx = this.x - this.baseX;
            this.x -= dx / 10;
          }
          if (this.y !== this.baseY) {
            const dy = this.y - this.baseY;
            this.y -= dy / 10;
          }
        }

        this.y -= this.velocity;
        if (this.y < 0) {
          this.y = canvas.height;
        }
        this.draw();
      }
    }

    function init() {
      particlesArray.length = 0;
      for (let i = 0; i < numberOfParticles; i++) {
        const x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        if ((y > canvas.height * 0.3 && y < canvas.height * 0.7) || (y > canvas.height * 0.1 && y < canvas.height * 0.2)) {
          y = Math.random() * canvas.height * 0.1;
        }
        particlesArray.push(new Particle(x, y));
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
      }
      requestAnimationFrame(animate);
    }

    init();
    animate();

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    });
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex relative">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />
      <div className="absolute top-0 left-0 w-full h-full z-0" style={{ background: 'radial-gradient(circle at center, rgba(36, 36, 62, 0.9), rgba(15, 12, 41, 0.7), rgba(0, 0, 0, 0.9))' }}></div>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-gray-900 via-gray-800 to-black bg-opacity-75 p-4 flex flex-col justify-between transition-transform transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } z-20 rounded-tr-3xl rounded-br-3xl backdrop-filter backdrop-blur-lg`}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        <div>
          <div className="text-2xl font-bold text-white italic mb-4" style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif', textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)' }}>Zap</div>
          <button
            className="w-full bg-violet-600 text-white py-2 px-4 rounded-lg flex items-center justify-center hover:bg-violet-700 mb-4"
            onClick={startNewChat}
          >
            <PlusCircle className="w-5 h-5 mr-2" /> Start New Chat
          </button>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search old chats"
              value={searchTerm}
              onChange={handleSearch}
              className="w-full bg-gray-800 text-white py-2 px-4 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <Search className="absolute right-4 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <nav className="space-y-4">
            <a href="#" className="block text-lg font-bold hover:text-violet-400">Your Chats</a>
            {/* Display chats below 30 days old */}
            <div className="text-sm text-gray-400 space-y-2">
              {chats.map((chat, index) => (
                <div
                  key={index}
                  className="bg-gray-800 p-2 rounded-lg hover:text-white cursor-pointer"
                  onClick={() => handleChatClick(chat)}
                >
                  <div className="font-bold">{chat.title}</div>
                  <div className="text-xs">{chat.date}</div>
                </div>
              ))}
            </div>
          </nav>
        </div>
        <div className="space-y-4">
          <button className="w-full bg-gray-800 text-white py-2 px-4 rounded-lg flex items-center justify-center hover:bg-gray-700">
            <Settings className="w-5 h-5 mr-2" /> Settings
          </button>
          <button className="w-full bg-gray-800 text-white py-2 px-4 rounded-lg flex items-center justify-center hover:bg-gray-700">
            <HelpCircle className="w-5 h-5 mr-2" /> Help Center
          </button>
        </div>
      </aside>

      {/* Sidebar Hover Area */}
      <div
        className="fixed top-0 left-0 h-full w-16 z-30"
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        {!sidebarOpen && (
          <div className="fixed bottom-4 left-4 bg-gray-900 p-2 rounded-full cursor-pointer">
            <Menu className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 flex flex-col items-center relative z-10">
        {/* Navbar */}
        <div className="fixed top-0 left-0 w-full h-16 p-2 flex justify-center items-center bg-black bg-opacity-40 backdrop-filter backdrop-blur-lg">
          <div className="flex items-center">
            <span className="text-4xl font-bold text-white italic" style={{ textShadow: '0 0 6px #8a2be2, 0 0 15px #8a2be2, 0 0 25px #8a2be2, 0 0 45px #8a2be2' }}>Z̶a̶p̶</span>
          </div>
        </div>

        {/* Logo and Header */}
        <div className="w-full max-w-4xl text-center mb-9 mt-20">
          <h1 className="text-5xl font-bold mb-3">W̶h̶a̶t̶ d̶o̶ y̶o̶u̶ w̶a̶n̶t̶ t̶o̶ b̶u̶i̶l̶d̶?̶</h1>
          <p className="text-md">Prompt, run, edit, and deploy full-stack web apps.</p>
        </div>

        {/* Pop-up Window */}
        <div className="relative bg-gray-800 bg-opacity-75 p-6 rounded-lg shadow-lg w-full max-w-lg text-center">
          <div className="neon-border"></div>
          <h2 className="text-xl font-bold mb-4"></h2>
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the website you want to build..."
              className="w-full h-24 p-3 bg-black bg-opacity-50 text-gray-200 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none placeholder-gray-400"
              style={{ borderTopLeftRadius: '0.5rem', borderTopLeftColor: 'red', borderStyle: 'solid', borderWidth: '2px' }}
            />
            {prompt.trim() && (
              <button
                type="submit"
                className="absolute right-4 bottom-4 bg-violet-600 text-white p-2 rounded-full hover:bg-violet-700 transition-transform transform hover:scale-105"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </form>
        </div>

        {/* Prompts */}
        <div className="mt-7 w-full max-w-3xl text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6 justify-center">
            {[
              "Start a blog with Astro",
              "Build a mobile app with NativeScript",
              "Create a docs site with Vitepress",
              "Scaffold UI with shadcn",
              "Draft a presentation with Slidev",
              "Code a video with Remotion",
            ].map((text, index) => (
              <div
                key={text}
                className={`cursor-pointer border border-gray-600 rounded-full px-1 py-0.5 text-sm text-gray-400 hover:bg-gray-600 hover:text-white transition-all transform hover:scale-105 animate-zoom-in-${index + 1}`}
                onClick={() => handlePromptClick(text)}
              >
                {text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-gray-400 mt-1">or start a blank app with your favorite stack</p>
        <div className="flex justify-center space-x-4 mt-4">
          {[
            { icon: <FaReact className="w-8 h-8" />, name: "React" },
            { icon: <FaVuejs className="w-8 h-8" />, name: "Vue.js" },
            { icon: <FaAngular className="w-8 h-8" />, name: "Angular" },
            { icon: <FaNodeJs className="w-8 h-8" />, name: "Node.js" },
            { icon: <FaJs className="w-8 h-8" />, name: "JavaScript" },
            { icon: <SiNextdotjs className="w-8 h-8" />, name: "Next.js" }
          ].map((tech) => (
            <div
              key={tech.name}
              className="relative group cursor-pointer text-gray-400 hover:text-white transition-all transform hover:scale-105"
            >
              {tech.icon}
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full bg-gray-800 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {tech.name}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}