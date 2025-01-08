import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { Loader } from '../components/Loader';
import { MessageSquare, Send, Zap, FileCode, Folder } from 'lucide-react';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import "./Builder.css";

export function Builder() {
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
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps.filter(({status}) => status === "pending").map(step => {
      updateHappened = true;
      if (step?.type === StepType.CreateFile) {
        let parsedPath = step.path?.split("/") ?? [];
        let currentFileStructure = [...originalFiles];
        const finalAnswerRef = currentFileStructure;
  
        let currentFolder = ""
        while(parsedPath.length) {
          currentFolder =  `${currentFolder}/${parsedPath[0]}`;
          const currentFolderName = parsedPath[0];
          parsedPath = parsedPath.slice(1);
  
          if (!parsedPath.length) {
            const file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: step.code
              })
            } else {
              file.content = step.code;
            }
          } else {
            const folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              })
            }
  
            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
      }
    })

    if (updateHappened) {
      setFiles(originalFiles)
      setSteps(steps => steps.map((s: Step) => ({
        ...s,
        status: "completed"
      })))
    }
    console.log(files);
  }, [steps, files]);

  useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};
  
      const processFile = (file: FileItem, isRootFolder: boolean) => {  
        if (file.type === 'folder') {
          mountStructure[file.name] = {
            directory: file.children ? 
              Object.fromEntries(
                file.children.map(child => [child.name, processFile(child, false)])
              ) 
              : {}
          };
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || ''
              }
            };
          } else {
            return {
              file: {
                contents: file.content || ''
              }
            };
          }
        }
  
        return mountStructure[file.name];
      };
  
      files.forEach(file => processFile(file, true));
  
      return mountStructure;
    };
  
    const mountStructure = createMountStructure(files);
  
    console.log(mountStructure);
    webcontainer?.mount(mountStructure);
  }, [files, webcontainer]);

  async function init() {
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim()
    });
    setTemplateSet(true);
    
    const {prompts, uiPrompts} = response.data;

    setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
      ...x,
      status: "pending"
    })));

    setLoading(true);
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, prompt].map(content => ({
        role: "user",
        content
      }))
    })

    setLoading(false);

    setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
      ...x,
      status: "pending" as const
    }))]);

    setLlmMessages([...prompts, prompt].map(content => ({
      role: "user",
      content
    })));

    setLlmMessages(x => [...x, {role: "assistant", content: stepsResponse.data.response}])
  }

  useEffect(() => {
    init();
  }, [prompt])

  async function init() {
    try {
      const response = await axios.post(`${BACKEND_URL}/template`, {
        prompt: prompt.trim()
      });
      setTemplateSet(true);
      
      const {prompts, uiPrompts} = response.data;

      setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
        ...x,
        status: "pending"
      })));

      setLoading(true);
      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
        messages: [...prompts, prompt].map(content => ({
          role: "user",
          content
        }))
      });

      setLoading(false);

      setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
        ...x,
        status: "pending" as const
      }))]);

      setLlmMessages([...prompts, prompt].map(content => ({
        role: "user",
        content
      })));

      setLlmMessages(x => [...x, {role: "assistant", content: stepsResponse.data.response}]);
    } catch (error) {
      setApiError(true);
      setLoading(false);
      setTemplateSet(true);
    }
  }

  // Keep handleSendMessage with try-catch
  const handleSendMessage = async () => {
    if (!userPrompt.trim()) return;

    const newMessage = {
      role: "user" as const,
      content: userPrompt
    };

    try {
      setLoading(true);
      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
        messages: [...llmMessages, newMessage]
      });
      setLoading(false);

      setLlmMessages(x => [...x, newMessage]);
      setLlmMessages(x => [...x, {
        role: "assistant",
        content: stepsResponse.data.response
      }]);
      
      setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
        ...x,
        status: "pending" as const
      }))]);

      setPrompt("");
    } catch (error) {
      setApiError(true);
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-black via-purple-950 to-black overflow-hidden">
      <header className="h-12 flex-none bg-black/90 backdrop-blur-md border-b border-purple-900/20 relative z-20">
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
          {/* Left Panel */}
          <div className="col-span-3 flex flex-col bg-black/50 backdrop-blur rounded-lg border border-purple-900/20 shadow-xl overflow-hidden h-[calc(100vh-5rem)]">
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
            </div>
            {/* Chat Input - Fixed at bottom */}
            <div className="flex-none p-3 bg-black/80 border-t border-purple-900/20">
              {(loading || !templateSet) ? (
                <div className="flex items-center justify-center w-full">
                  <Loader />
                </div>
              ) : (
                <div className="flex gap-2">
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
                    className="flex-none p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    disabled={loading}
                  >
                    <Send size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="col-span-9 flex flex-col bg-black/50 backdrop-blur rounded-lg border border-purple-900/20 shadow-xl overflow-hidden h-[calc(100vh-5rem)]">
          <div className="flex-none p-2 border-b border-purple-900/20">
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

            <div className="flex-1 grid grid-cols-5 overflow-hidden">
              {/* File Explorer */}
              <div className="col-span-1 flex flex-col border-r border-purple-900/20 bg-black/80 h-full overflow-hidden">
                <div className="flex-none p-2 border-b border-purple-900/20">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Folder size={14} />
                    <span className="text-sm font-medium">Files</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto h-full">
                  <FileExplorer 
                    files={files} 
                    onFileSelect={setSelectedFile}
                  />
                </div>
              </div>

              {/* Code Editor / Preview */}
              <div className="col-span-4 flex flex-col h-full overflow-hidden">
                {activeTab === 'code' ? (
                  <>
                    {selectedFile && (
                      <div className="flex-none p-2 border-b border-purple-900/20 flex items-center gap-2 text-gray-400">
                        <FileCode size={14} />
                        <span className="text-sm font-medium">{selectedFile.path}</span>
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto h-full">
                      <CodeEditor file={selectedFile} />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto h-full">
                    <PreviewFrame webContainer={webcontainer} files={files} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Error Modal */}
      {apiError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-purple-900/20 rounded-lg p-6 max-w-md mx-4">
            <h2 className="text-xl font-semibold text-white mb-3">API Service Disabled</h2>
            <p className="text-gray-300 mb-4">
              The API service is currently disabled by the owner. To use this service, please contact:
            </p>
            <a 
              href="mailto:surajsahu13sk@gmail.com"
              className="text-purple-400 hover:text-purple-300 font-medium break-all"
            >
              surajsahu13sk@gmail.com
            </a>
            <button
              onClick={() => setApiError(false)}
              className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}