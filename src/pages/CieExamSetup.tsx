import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Database, Bot, Loader2 } from "lucide-react";
import { uploadAPI, coursesAPI } from "@/lib/api";
import NetworkGridBackground from "@/components/NetworkGridBackground";
import TopicSelector from "@/components/TopicSelector";

interface QuestionConfig {
  questionId: string;
  level: string;
  marks: number;
  includeC: boolean; // For c parts (1c, 2c, 3c)
  topic: string; // For topic-based question generation
}

interface ProcessedTopic {
  unit: string;
  topic_id: number;
  topic: string;
}

interface Course {
  _id: string;
  name: string;
  code: string;
}

const CieExamSetup = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [examConfig, setExamConfig] = useState<{
    examType: string;
    semester: string;
    course: string;
    courseId?: string;
    hasQuestionBank?: boolean;
  } | null>(null);
  
  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>([]);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [processedTopics, setProcessedTopics] = useState<ProcessedTopic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [hasProcessedData, setHasProcessedData] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    const state = location.state as {
      examType: string;
      semester: string;
      course: string;
      courseId?: string;
      hasQuestionBank?: boolean;
    } | null;
    
    if (!state) {
      toast({
        title: "Error",
        description: "No exam configuration provided",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
    
    setExamConfig(state);
    
    // Initialize question configurations
    initializeQuestionConfigs();
    
    // Load data
    loadInitialData(state);
  }, [isAuthenticated, location.state, navigate, toast]);

  const loadInitialData = async (state: any) => {
    try {
      setIsLoadingData(true);
      
      // First fetch courses
      const coursesResponse = await coursesAPI.getAllCourses();
      setCourses(coursesResponse.data);
      
      // Find the course ID
      let courseId = state.courseId;
      if (!courseId && state.course) {
        const course = coursesResponse.data.find((c: Course) => c.code === state.course);
        courseId = course?._id;
      }
      
      if (courseId) {
        setSelectedCourseId(courseId);
        
        // Load processed data for this course
        await loadProcessedData(courseId);
      } else {
        console.log("No course ID found");
        setHasProcessedData(false);
        setDefaultTopics();
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setHasProcessedData(false);
      setDefaultTopics();
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadProcessedData = async (courseId: string) => {
    try {
      console.log("Loading processed data for course:", courseId);
      
      const response = await uploadAPI.getProcessedData(courseId);
      
      if (response.data && response.data.questions.length > 0) {
        console.log("Processed data found:", response.data);
        
        setHasProcessedData(true);
        setProcessedTopics(response.data.topics || []);
        
        // Extract unique topics from processed data
        const topics = response.data.topics ? response.data.topics.map((t: ProcessedTopic) => t.topic) : [];
        console.log("Extracted topics:", topics);
        
        setAvailableTopics(topics);
        
        toast({
          title: "Processed data loaded",
          description: `Found ${response.data.questions.length} questions and ${topics.length} topics`,
        });
      } else {
        console.log("No processed data found");
        setHasProcessedData(false);
        setDefaultTopics();
      }
    } catch (error) {
      console.error("Error loading processed data:", error);
      setHasProcessedData(false);
      setDefaultTopics();
    }
  };

  const setDefaultTopics = () => {
    const defaultTopics = [
      "Introduction to Operating Systems",
      "Process Management",
      "Memory Management", 
      "File Systems",
      "I/O Systems",
      "Virtualization",
      "Distributed Systems",
      "Security and Protection"
    ];
    console.log("Setting default topics:", defaultTopics);
    setAvailableTopics(defaultTopics);
  };

  const initializeQuestionConfigs = () => {
    const initialConfigs: QuestionConfig[] = [];
    
    // Create configs for questions 1a, 1b, 1c, 2a, 2b, 2c, 3a, 3b, 3c
    for (let section = 1; section <= 3; section++) {
      for (const part of ['a', 'b', 'c']) {
        initialConfigs.push({
          questionId: `${section}${part}`,
          level: part === 'c' ? "hard" : "medium",
          marks: 5, // 5 marks each: a=5, b=5, c=5 = 15 total
          includeC: part !== 'c', // 'c' parts are optional by default
          topic: ""
        });
      }
    }
    
    setQuestionConfigs(initialConfigs);
  };

  const handleLevelChange = (questionId: string, level: string) => {
    setQuestionConfigs(prevConfigs => 
      prevConfigs.map(config => 
        config.questionId === questionId ? { ...config, level } : config
      )
    );
  };

  const handleMarksChange = (questionId: string, marks: number) => {
    setQuestionConfigs(prevConfigs => 
      prevConfigs.map(config => 
        config.questionId === questionId ? { ...config, marks } : config
      )
    );
  };

  const handleIncludeCChange = (questionId: string, includeC: boolean) => {
    if (questionId.endsWith('c')) {
      setQuestionConfigs(prevConfigs => 
        prevConfigs.map(config => 
          config.questionId === questionId ? { ...config, includeC } : config
        )
      );
    }
  };

  const handleTopicChange = (questionId: string, topic: string) => {
    setQuestionConfigs(prevConfigs => 
      prevConfigs.map(config => 
        config.questionId === questionId ? { ...config, topic } : config
      )
    );
  };

  const handleSubmit = () => {
    // Validation logic remains the same
    const sections = ["1", "2", "3"];
    
    for (const section of sections) {
      const sectionQuestions = questionConfigs.filter(q => q.questionId.startsWith(section));
      const sectionMarks = sectionQuestions.reduce((sum, q) => {
        if (q.questionId.endsWith('c') && !q.includeC) {
          return sum;
        }
        return sum + q.marks;
      }, 0);
      
      if (sectionMarks !== 15) {
        toast({
          title: "Invalid marks distribution",
          description: `Section ${section} must have a total of 15 marks. Current total: ${sectionMarks}`,
          variant: "destructive",
        });
        return;
      }
    }
    
    const activeQuestions = questionConfigs.filter(q => !q.questionId.endsWith('c') || q.includeC);
    const missingTopics = activeQuestions.some(q => !q.topic);
    
    if (missingTopics) {
      toast({
        title: "Missing topic selection",
        description: "Please select a topic for each active question",
        variant: "destructive",
      });
      return;
    }
    
    navigate("/generate-questions", {
      state: {
        examConfig: {
          ...examConfig,
          courseId: selectedCourseId
        },
        questionConfigs,
        numQuestions,
        useQuestionBank: hasProcessedData
      }
    });
  };

  const goBack = () => {
    navigate("/exam-type-selection", { 
      state: examConfig?.hasQuestionBank ? { 
        preSelectedCourse: examConfig.course,
        hasQuestionBank: true 
      } : undefined 
    });
  };

  if (!examConfig) {
    return (
      <NetworkGridBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Loading...</div>
        </div>
      </NetworkGridBackground>
    );
  }

  if (isLoadingData) {
    return (
      <NetworkGridBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-black/40 backdrop-blur-sm p-8 rounded-lg border border-cyan-500/30">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
            <span className="mt-4 block text-white text-center">Loading exam data...</span>
          </div>
        </div>
      </NetworkGridBackground>
    );
  }

  // Group questions by section for easier rendering
  const sections = [
    questionConfigs.filter(q => q.questionId.startsWith('1')),
    questionConfigs.filter(q => q.questionId.startsWith('2')),
    questionConfigs.filter(q => q.questionId.startsWith('3')),
  ];

  console.log("Available topics in render:", availableTopics);

  return (
    <NetworkGridBackground>
      <div className="min-h-screen">
        <header className="bg-black/40 backdrop-blur-sm border-b border-cyan-500/20 shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
            <Button variant="ghost" size="sm" onClick={goBack} className="mr-4 text-cyan-100 hover:bg-cyan-900/30 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white">CIE Exam Configuration</h1>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Card className="mb-6 shadow-xl bg-black/40 backdrop-blur-sm border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white">Exam Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-cyan-300">Exam Type</p>
                    <p className="mt-1 text-white">{examConfig.examType === "CIE" ? "CIE" : "Semester End"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cyan-300">Semester</p>
                    <p className="mt-1 text-white">{examConfig.semester}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cyan-300">Course</p>
                    <p className="mt-1 text-white">{examConfig.course}</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 rounded-md border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {hasProcessedData ? (
                        <>
                          <Database className="h-5 w-5 text-green-400" />
                          <Badge variant="default" className="bg-green-600">Processed Data Available</Badge>
                        </>
                      ) : (
                        <>
                          <Bot className="h-5 w-5 text-blue-400" />
                          <Badge variant="secondary">AI Generation Mode</Badge>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-cyan-200">
                      {hasProcessedData 
                        ? `${availableTopics.length} topics from your question bank`
                        : "Questions will be generated using AI with default topics"
                      }
                    </p>
                  </div>
                  
                  {hasProcessedData && (
                    <Alert className="mt-3 bg-green-900/20 border-green-500/30">
                      <AlertDescription className="text-green-100">
                        <strong>Smart Generation:</strong> Questions will be intelligently selected from your uploaded question bank based on difficulty, marks, and topics.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Debug Information - Remove in production */}
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
                  <p className="text-yellow-100 text-sm">
                    <strong>Debug Info:</strong> Available topics count: {availableTopics.length}
                    <br />
                    Topics: {availableTopics.join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mb-6 shadow-xl bg-black/40 backdrop-blur-sm border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white">Question Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {sections.map((sectionQuestions, idx) => (
                    <div key={idx} className="border border-cyan-500/30 p-4 rounded-md bg-black/20">
                      <h3 className="text-lg font-medium mb-3 text-cyan-100">Section {idx + 1}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {sectionQuestions.map((question) => (
                          <div key={question.questionId} className="border border-cyan-500/20 p-3 rounded-md bg-black/30">
                            <p className="font-medium mb-2 text-white">Question {question.questionId.toUpperCase()}</p>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm text-cyan-200">Topic</label>
                                <TopicSelector
                                  topics={availableTopics}
                                  selectedTopic={question.topic}
                                  onChange={(topic) => handleTopicChange(question.questionId, topic)}
                                  placeholder={availableTopics.length > 0 ? "Select topic for this question" : "No topics available"}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm text-cyan-200">Difficulty Level</label>
                                <Select
                                  value={question.level}
                                  onValueChange={(value) => handleLevelChange(question.questionId, value)}
                                >
                                  <SelectTrigger className="border-cyan-500/30 bg-black/50 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 text-white border-slate-700">
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <label className="text-sm text-cyan-200">Marks</label>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max="15"
                                  value={question.marks} 
                                  onChange={(e) => handleMarksChange(question.questionId, parseInt(e.target.value) || 0)}
                                  className="bg-black/50 border-cyan-500/30 text-white"
                                />
                              </div>
                              
                              {question.questionId.endsWith('c') && (
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`include-${question.questionId}`}
                                    checked={question.includeC}
                                    onCheckedChange={(checked) => 
                                      handleIncludeCChange(question.questionId, checked as boolean)
                                    }
                                    className="border-white/50 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                                  />
                                  <label 
                                    htmlFor={`include-${question.questionId}`}
                                    className="text-sm cursor-pointer text-cyan-100"
                                  >
                                    Include {question.questionId.toUpperCase()}
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="mb-6 shadow-xl bg-black/40 backdrop-blur-sm border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white">Generation Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-cyan-200">Number of questions to generate per section</label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="20"
                    value={numQuestions} 
                    onChange={(e) => setNumQuestions(parseInt(e.target.value) || 1)}
                    className="bg-black/50 border-cyan-500/30 text-white"
                  />
                  <p className="text-sm text-cyan-200/70">
                    {hasProcessedData 
                      ? `AI will select the best ${numQuestions} questions from your question bank for each section`
                      : `AI will generate ${numQuestions} question options for each section`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end mt-6">
              <Button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-500">
                Generate Question Paper
              </Button>
            </div>
          </div>
        </main>
      </div>
    </NetworkGridBackground>
  );
};

export default CieExamSetup;