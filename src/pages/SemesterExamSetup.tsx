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
  includeC: boolean; // For c parts
  co: number; // Course Outcome (1-5)
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

const SemesterExamSetup = () => {
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
        console.log("No course ID found for SEE");
        setHasProcessedData(false);
        setDefaultTopics();
      }
    } catch (error) {
      console.error("Error loading initial data for SEE:", error);
      setHasProcessedData(false);
      setDefaultTopics();
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadProcessedData = async (courseId: string) => {
    try {
      console.log("Loading processed data for SEE course:", courseId);
      
      const response = await uploadAPI.getProcessedData(courseId);
      
      if (response.data && response.data.questions.length > 0) {
        console.log("SEE Processed data found:", response.data);
        
        setHasProcessedData(true);
        setProcessedTopics(response.data.topics || []);
        
        // Extract unique topics from processed data
        const topics = response.data.topics ? response.data.topics.map((t: ProcessedTopic) => t.topic) : [];
        console.log("SEE Extracted topics:", topics);
        
        setAvailableTopics(topics);
        
        toast({
          title: "Processed data loaded",
          description: `Found ${response.data.questions.length} questions and ${topics.length} topics`,
        });
      } else {
        console.log("No processed data found for SEE");
        setHasProcessedData(false);
        setDefaultTopics();
      }
    } catch (error) {
      console.error("Error loading processed data for SEE:", error);
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
    console.log("Setting default topics for SEE:", defaultTopics);
    setAvailableTopics(defaultTopics);
  };

  const initializeQuestionConfigs = () => {
    // Initialize question configuration for semester-end exam (10 sections, 3 questions each - a, b, c)
    const initialConfigs: QuestionConfig[] = [];
    for (let questionNum = 1; questionNum <= 10; questionNum++) {
      const co = Math.ceil(questionNum / 2); // Maps questions 1-2 to CO1, 3-4 to CO2, etc.
      
      ['a', 'b', 'c'].forEach(part => {
        initialConfigs.push({
          questionId: `${questionNum}${part}`,
          level: part === 'c' ? 'hard' : 'medium',
          marks: part === 'a' ? 5 : part === 'b' ? 7 : 8, // a: 5 marks, b: 7 marks, c: 8 marks
          includeC: part !== 'c', // c parts are optional by default
          co,
          topic: ""
        });
      });
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
    // Validate total marks per course outcome (CO)
    const cos = [1, 2, 3, 4, 5];
    
    for (const co of cos) {
      // Each CO has 2 sets of questions (e.g., CO1 has questions 1 and 2)
      const coQuestionSets = [
        questionConfigs.filter(q => q.co === co && parseInt(q.questionId) === (co * 2) - 1), // Odd numbered questions
        questionConfigs.filter(q => q.co === co && parseInt(q.questionId) === co * 2) // Even numbered questions
      ];
      
      // Check if both sets have valid marks (20 marks per set)
      for (const [idx, questionSet] of coQuestionSets.entries()) {
        const setMarks = questionSet.reduce((sum, q) => {
          // Only count marks for questions that will be included
          if (q.questionId.endsWith('c') && !q.includeC) {
            return sum;
          }
          return sum + q.marks;
        }, 0);
        
        // Each set should have a total of 20 marks
        if (setMarks !== 20) {
          const questionNum = idx === 0 ? (co * 2) - 1 : co * 2;
          toast({
            title: "Invalid marks distribution",
            description: `Question ${questionNum} (CO${co}) must have a total of 20 marks. Current total: ${setMarks}`,
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    // Validate that each active question has a topic selected
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
    
    // Navigate to question generation page with the configuration
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
            <span className="mt-4 block text-white text-center">Loading SEE exam data...</span>
          </div>
        </div>
      </NetworkGridBackground>
    );
  }

  // Group questions by CO for easier rendering
  const courseOutcomes = [1, 2, 3, 4, 5];

  console.log("SEE Available topics in render:", availableTopics);

  return (
    <NetworkGridBackground>
      <div className="min-h-screen">
        <header className="bg-black/40 backdrop-blur-sm border-b border-cyan-500/20 shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
            <Button variant="ghost" size="sm" onClick={goBack} className="mr-4 text-cyan-100 hover:bg-cyan-900/30 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white">Semester End Exam Configuration</h1>
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
                    <strong>SEE Debug Info:</strong> Available topics count: {availableTopics.length}
                    <br />
                    Topics: {availableTopics.join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-6">
              {courseOutcomes.map(co => (
                <Card key={co} className="mb-6 shadow-xl bg-black/40 backdrop-blur-sm border-cyan-500/30">
                  <CardHeader>
                    <CardTitle className="text-white">Course Outcome {co} (CO{co})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Each CO has 2 question sets (e.g., questions 1 and 2 for CO1) */}
                      {[1, 2].map(setIdx => {
                        const questionNum = (co - 1) * 2 + setIdx;
                        const questionSet = questionConfigs.filter(q => parseInt(q.questionId) === questionNum);
                        
                        return (
                          <div key={questionNum} className="border border-cyan-500/30 p-4 rounded-md bg-black/20">
                            <h3 className="text-lg font-medium mb-3 text-cyan-100">Question {questionNum}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {questionSet.map((question) => (
                                <div key={question.questionId} className="border border-cyan-500/20 p-3 rounded-md bg-black/30">
                                  <p className="font-medium mb-2 text-white">Part {question.questionId.slice(-1).toUpperCase()}</p>
                                  
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
                                        max="20"
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
                                          Include part C
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
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

export default SemesterExamSetup;