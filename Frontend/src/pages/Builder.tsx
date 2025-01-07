import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { Loader } from '../components/Loader';
import { MessageSquare, Send, Zap, FileCode, Folder } from 'lucide-react';

export function Builder() {
  // Keep all existing state and functions
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{role: "user" | "assistant", content: string;}[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  // Keep all existing useEffects and functions

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950/10 to-black">
      {/* Navbar - reduced height */}
      <header className="h-12 bg-black/90 backdrop-blur-md border-b border-purple-900/20 relative z-20">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/20 via-violet-900/10 to-violet-950/20"></div>
        <div className="h-full flex items-center justify-between px-6 relative z-10">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-white font-semibold">Zap</span>
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <p className="text-sm text-white/90 font-medium max-w-2xl truncate">
              {prompt}
            </p>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-4 p-4">
          {/* Left Sidebar - Steps */}
          <div className="col-span-3 bg-black/50 backdrop-blur rounded-lg border border-purple-900/20 shadow-xl overflow-hidden">
            <div className="h-[calc(100vh-12rem)] overflow-y-auto p-4">
              <StepsList
                steps={steps}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
              />
            </div>
            {/* Prompt input area */}
            <div className="absolute bottom-0 left-0 w-1/4 p-3 bg-black/80 border-t border-purple-900/20">
              <div className="flex items-center gap-2">
                {(loading || !templateSet) ? (
                  <div className="flex items-center justify-center w-full">
                    <Loader />
                  </div>
                ) : (
                  <div className="flex w-full gap-2">
                    <textarea
                      value={userPrompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 bg-gray-900/50 text-white rounded-lg p-2 min-h-[40px] max-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 border border-purple-900/20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      disabled={loading}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-9 bg-black/50 backdrop-blur rounded-lg border border-purple-900/20 shadow-xl overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Code/Preview Toggle - reduced height */}
              <div className="p-2 border-b border-purple-900/20 flex items-center">
                <div className="bg-gray-900/50 rounded-lg p-1 inline-flex">
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'code'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {/* Code Editor Layout */}
              <div className="flex-1 grid grid-cols-5 overflow-hidden">
                {/* File Explorer - reduced header height */}
                <div className="col-span-1 border-r border-purple-900/20 bg-black/80">
                  <div className="p-2 border-b border-purple-900/20">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Folder size={14} />
                      <span className="text-sm font-medium">Files</span>
                    </div>
                  </div>
                  <div className="overflow-y-auto h-[calc(100%-2.5rem)]">
                    <FileExplorer 
                      files={files} 
                      onFileSelect={setSelectedFile}
                    />
                  </div>
                </div>

                {/* Code/Preview Area */}
                <div className="col-span-4">
                  <div className="h-full">
                    {activeTab === 'code' ? (
                      <div className="h-full flex flex-col">
                        {selectedFile && (
                          <div className="p-2 border-b border-purple-900/20 flex items-center gap-2 text-gray-400">
                            <FileCode size={14} />
                            <span className="text-sm font-medium">{selectedFile.path}</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <CodeEditor file={selectedFile} />
                        </div>
                      </div>
                    ) : (
                      <PreviewFrame webContainer={webcontainer} files={files} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}