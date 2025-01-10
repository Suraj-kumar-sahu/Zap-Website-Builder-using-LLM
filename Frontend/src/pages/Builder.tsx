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
  const [previewError, setPreviewError] = useState<string | null>(null);

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
    } catch (error) {
      console.error("Error during initialization:", error);
      setApiError(true);
    }
  }

  useEffect(() => {
    init();
  }, [prompt])

  const handleSendMessage = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${BACKEND_URL}/chat`, {
        messages: [...llmMessages, { role: "user", content: userPrompt }]
      });
      setLlmMessages(x => [...x, { role: "user", content: userPrompt }, { role: "assistant", content: response.data.response }]);
      setPrompt("");
      setLoading(false);
    } catch (error) {
      console.error("Error sending message:", error);
      setApiError(true);
      setLoading(false);
    }
  };

  const handleFixError = () => {
    // Implement your error fixing logic here
    console.log("Fixing error...");
    setApiError(false);
    setPreviewError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black">
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
          <div className="col-span-3 bg-black/50 backdrop-blur rounded-lg border border-purple-900/20 shadow-xl overflow-hidden">
            <div className="h-[calc(100vh-12rem)] overflow-y-auto p-4">
              <StepsList
                steps={steps}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
              />
            </div>
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
          <div className="col-span-9 bg-black/50 backdrop-blur rounded-lg border border-purple-900/20 shadow-xl overflow-hidden">
            <div className="h-full flex flex-col">
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
              <div className="flex-1 grid grid-cols-5 overflow-hidden">
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
                <div className="col-span-4">
                  <div className="h-full relative">
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
                      <div className="h-full relative">
                        {previewError ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-500/50 text-white">
                            <p>{previewError}</p>
                          </div>
                        ) : (
                          <PreviewFrame
                            webContainer={webcontainer}
                            files={files}
                            onError={(error) => setPreviewError(error.message)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {apiError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-purple-900/20 rounded-lg p-6 max-w-md mx-4">
            <h2 className="text-xl font-semibold text-white mb-3">API Service Error</h2>
            <p className="text-gray-300 mb-4">
              An error occurred while communicating with the API. Please try again later.
            </p>
            <button
              onClick={handleFixError}
              className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 transition-colors"
            >
              Fix Error
            </button>
          </div>
        </div>
      )}
    </div>
  );
}