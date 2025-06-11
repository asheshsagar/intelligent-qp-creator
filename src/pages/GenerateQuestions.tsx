// src/pages/GenerateQuestions.tsx - Updated with question paper saving and download tracking
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Loader2, Database, Bot, BarChart3, FileText, Shuffle, Save } from "lucide-react";
import { questionAPI, uploadAPI, questionPaperAPI } from "@/lib/api";
import NetworkGridBackground from "@/components/NetworkGridBackground";

interface QuestionConfig {
  questionId: string;
  level: string;
  marks: number;
  includeC: boolean;
  co?: number;
  topic: string;
}

// Your exact processed data structure
interface ProcessedQuestion {
  question_id: number;
  question: string;
  predicted_marks: number;
  bloom_level: string;
  difficulty: string;
  matched_topic: string;
  matched_unit: string;
  topic_similarity: number;
  _id: string;
}

interface ProcessedTopic {
  unit: string;
  topic_id: number;
  topic: string;
  _id: string;
}

interface GeneratedQuestion {
  questionId: string;
  text: string;
  marks: number;
  difficulty: string;
  bloomLevel: string;
  unit: string;
  topic: string;
  co?: number;
  source: 'processed_data' | 'ai_generated';
  originalId?: string;
  similarity?: number;
}

interface ExamConfig {
  examType: string;
  semester: string;
  course: string;
  courseId: string;
  hasQuestionBank?: boolean;
}

const GenerateQuestions = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [questionPaperText, setQuestionPaperText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedPaperId, setSavedPaperId] = useState<string | null>(null);
  const [hasProcessedData, setHasProcessedData] = useState<boolean>(false);
  const [processedQuestions, setProcessedQuestions] = useState<ProcessedQuestion[]>([]);
  const [processedTopics, setProcessedTopics] = useState<ProcessedTopic[]>([]);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [examData, setExamData] = useState<{
    examConfig: ExamConfig;
    questionConfigs: QuestionConfig[];
    numQuestions: number;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    const state = location.state as {
      examConfig: ExamConfig;
      questionConfigs: QuestionConfig[];
      numQuestions: number;
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
    
    setExamData(state);
    loadProcessedData(state.examConfig.courseId);
  }, [isAuthenticated, location.state, navigate, toast]);

  const loadProcessedData = async (courseId: string) => {
    try {
      const response = await uploadAPI.getProcessedData(courseId);
      
      if (response.data && response.data.questions.length > 0) {
        setHasProcessedData(true);
        setProcessedQuestions(response.data.questions);
        setProcessedTopics(response.data.topics || []);
        
        toast({
          title: "Latest processed data loaded",
          description: `Found ${response.data.questions.length} questions and ${response.data.topics?.length || 0} topics from your latest question bank upload`,
        });
      } else {
        setHasProcessedData(false);
        toast({
          title: "No processed data",
          description: "No question bank data found. Questions will be generated using AI.",
        });
      }
    } catch (error) {
      console.error("Error loading processed data:", error);
      setHasProcessedData(false);
    }
  };

  const generateQuestionsFromProcessedData = (
    examConfig: ExamConfig,
    questionConfigs: QuestionConfig[]
  ): GeneratedQuestion[] => {
    const generated: GeneratedQuestion[] = [];
    
    console.log(`Processing ${processedQuestions.length} questions and ${processedTopics.length} topics`);
    
    if (examConfig.examType === 'CIE') {
      // Generate CIE questions (3 sections)
      const sections = [1, 2, 3];
      
      for (const section of sections) {
        const sectionConfigs = questionConfigs.filter(q => 
          q.questionId.startsWith(section.toString()) && 
          (!q.questionId.endsWith('c') || q.includeC)
        );
        
        for (const config of sectionConfigs) {
          const matchingQuestions = findMatchingQuestions(config, `Unit ${section}`);
          
          if (matchingQuestions.length > 0) {
            // Select best matching question
            const selectedQuestion = matchingQuestions[0];
            
            generated.push({
              questionId: config.questionId,
              text: selectedQuestion.question,
              marks: config.marks,
              difficulty: config.level,
              bloomLevel: selectedQuestion.bloom_level,
              unit: selectedQuestion.matched_unit,
              topic: config.topic,
              source: 'processed_data',
              originalId: selectedQuestion._id,
              similarity: selectedQuestion.topic_similarity
            });
          } else {
            // Generate AI fallback question
            generated.push(generateAIQuestion(config, section));
          }
        }
      }
    } else {
      // Generate SEE questions (5 COs, 2 questions each)
      const cos = [1, 2, 3, 4, 5];
      
      for (const co of cos) {
        for (let setIdx = 1; setIdx <= 2; setIdx++) {
          const questionNum = (co - 1) * 2 + setIdx;
          const questionSet = questionConfigs.filter(q => 
            parseInt(q.questionId) === questionNum &&
            (!q.questionId.endsWith('c') || q.includeC)
          );
          
          for (const config of questionSet) {
            const matchingQuestions = findMatchingQuestions(config);
            
            if (matchingQuestions.length > 0) {
              const selectedQuestion = matchingQuestions[0];
              
              generated.push({
                questionId: config.questionId,
                text: selectedQuestion.question,
                marks: config.marks,
                difficulty: config.level,
                bloomLevel: selectedQuestion.bloom_level,
                unit: selectedQuestion.matched_unit,
                topic: config.topic,
                co: co,
                source: 'processed_data',
                originalId: selectedQuestion._id,
                similarity: selectedQuestion.topic_similarity
              });
            } else {
              generated.push(generateAIQuestion(config, null, co));
            }
          }
        }
      }
    }
    
    return generated;
  };

  const findMatchingQuestions = (config: QuestionConfig, preferredUnit?: string): ProcessedQuestion[] => {
    return processedQuestions
      .filter(q => {
        // Match difficulty
        const difficultyMatch = q.difficulty.toLowerCase() === config.level.toLowerCase();
        
        // Match marks (allow ±2 marks difference)
        const marksMatch = Math.abs(q.predicted_marks - config.marks) <= 2;
        
        // Match topic (if specified)
        const topicMatch = !config.topic || 
          q.matched_topic.toLowerCase().includes(config.topic.toLowerCase());
        
        // Prefer specified unit
        const unitMatch = !preferredUnit || 
          q.matched_unit.toLowerCase().includes(preferredUnit.toLowerCase());
        
        return difficultyMatch && marksMatch && topicMatch;
      })
      .sort((a, b) => {
        // Sort by relevance
        let scoreA = 0, scoreB = 0;
        
        // Higher topic similarity is better
        scoreA += a.topic_similarity * 100;
        scoreB += b.topic_similarity * 100;
        
        // Exact marks match is better
        if (a.predicted_marks === config.marks) scoreA += 50;
        if (b.predicted_marks === config.marks) scoreB += 50;
        
        // Preferred unit match is better
        if (preferredUnit && a.matched_unit.includes(preferredUnit)) scoreA += 25;
        if (preferredUnit && b.matched_unit.includes(preferredUnit)) scoreB += 25;
        
        return scoreB - scoreA;
      });
  };

  const generateAIQuestion = (config: QuestionConfig, section?: number, co?: number): GeneratedQuestion => {
    const templates = {
      easy: [
        `Define and explain the concept of ${config.topic} with suitable examples.`,
        `List the key features and characteristics of ${config.topic}.`,
        `What are the basic components of ${config.topic}? Explain briefly.`,
        `Draw a simple diagram to illustrate ${config.topic}.`
      ],
      medium: [
        `Explain the working principle of ${config.topic} with detailed examples.`,
        `Analyze the advantages and disadvantages of ${config.topic}.`,
        `Describe the implementation process of ${config.topic} with algorithmic steps.`,
        `Compare and contrast ${config.topic} with other related concepts.`
      ],
      hard: [
        `Design and implement a comprehensive solution for ${config.topic} addressing complex scenarios.`,
        `Critically evaluate the performance implications of ${config.topic} in real-world systems.`,
        `Develop an optimized approach for ${config.topic} and justify your design decisions.`,
        `Create a novel algorithm incorporating ${config.topic} to solve industry challenges.`
      ]
    };
    
    const questionTemplates = templates[config.level as keyof typeof templates] || templates.medium;
    const questionText = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
    
    return {
      questionId: config.questionId,
      text: questionText,
      marks: config.marks,
      difficulty: config.level,
      bloomLevel: config.level === 'easy' ? 'L1' : config.level === 'medium' ? 'L3' : 'L5',
      unit: section ? `Unit ${section}` : 'General',
      topic: config.topic,
      co: co,
      source: 'ai_generated'
    };
  };

  const generateQuestionsWithProcessedData = async () => {
    if (!examData) return;
    
    setIsGenerating(true);
    setGenerationProgress(0);
    
    try {
      // Simulate progressive generation
      const progressSteps = [
        { progress: 20, message: "Analyzing question configurations..." },
        { progress: 40, message: "Matching questions from your latest question bank..." },
        { progress: 60, message: "Selecting best matching questions..." },
        { progress: 80, message: "Generating fallback questions..." },
        { progress: 100, message: "Formatting question paper..." }
      ];
      
      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setGenerationProgress(step.progress);
      }
      
      const questions = generateQuestionsFromProcessedData(
        examData.examConfig,
        examData.questionConfigs
      );
      
      setGeneratedQuestions(questions);
      
      // Generate formatted question paper
      const formattedPaper = formatQuestionPaper(examData.examConfig, questions);
      setQuestionPaperText(formattedPaper);
      
      const processedDataCount = questions.filter(q => q.source === 'processed_data').length;
      const aiGeneratedCount = questions.filter(q => q.source === 'ai_generated').length;
      
      toast({
        title: "Questions Generated Successfully",
        description: `Generated ${questions.length} questions (${processedDataCount} from your latest question bank, ${aiGeneratedCount} AI-generated)`,
      });
      
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: "There was an error generating questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const saveQuestionPaper = async () => {
    if (!examData || !questionPaperText) return;
    
    setIsSaving(true);
    
    try {
      const totalMarks = generatedQuestions.reduce((sum, q) => sum + q.marks, 0);
      const processedDataCount = generatedQuestions.filter(q => q.source === 'processed_data').length;
      const aiGeneratedCount = generatedQuestions.filter(q => q.source === 'ai_generated').length;
      
      let generationSource = 'ai_generated';
      if (processedDataCount > 0 && aiGeneratedCount > 0) {
        generationSource = 'hybrid';
      } else if (processedDataCount > 0) {
        generationSource = 'processed_data';
      }
      
      const paperData = {
        courseId: examData.examConfig.courseId,
        examType: examData.examConfig.examType,
        semester: examData.examConfig.semester,
        title: `${examData.examConfig.examType} - ${examData.examConfig.course} - Semester ${examData.examConfig.semester}`,
        content: questionPaperText,
        questions: generatedQuestions,
        totalMarks,
        totalQuestions: generatedQuestions.length,
        generationSource,
        processedDataUsed: hasProcessedData ? examData.examConfig.courseId : undefined
      };
      
      const response = await questionPaperAPI.saveQuestionPaper(paperData);
      setSavedPaperId(response.data.questionPaper._id);
      
      toast({
        title: "Question Paper Saved",
        description: "Your question paper has been saved successfully and is visible on your dashboard.",
      });
      
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: "Failed to save question paper. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatQuestionPaper = (examConfig: ExamConfig, questions: GeneratedQuestion[]) => {
    const courseMap: Record<string, string> = {
      "OS": "Operating Systems",
      "ML": "Machine Learning",
      "ACN": "Advanced Computer Networks",
      "DCN": "Data Communication Networks",
      "DL": "Deep Learning",
      "DS": "Data Structures",
      "DBMS": "Database Management Systems",
      "AI": "Artificial Intelligence"
    };
    
    const courseName = courseMap[examConfig.course] || examConfig.course;
    const currentDate = new Date().toLocaleDateString();
    
    let questionPaper = "";
    
    // Add header
    questionPaper += `═══════════════════════════════════════════════════════════════════════════════\n`;
    questionPaper += `                    ${examConfig.examType === "CIE" ? "CONTINUOUS INTERNAL EVALUATION" : "SEMESTER END EXAMINATION"}\n`;
    questionPaper += `═══════════════════════════════════════════════════════════════════════════════\n\n`;
    questionPaper += `Course: ${courseName} (${examConfig.course})\n`;
    questionPaper += `Semester: ${examConfig.semester}\n`;
    questionPaper += `Date: ${currentDate}\n`;
    questionPaper += `Duration: ${examConfig.examType === "CIE" ? "1.5 Hours" : "3 Hours"}\n`;
    questionPaper += `Maximum Marks: ${examConfig.examType === "CIE" ? "30" : "100"}\n\n`;
    
    questionPaper += `Instructions:\n`;
    if (examConfig.examType === "CIE") {
      questionPaper += `• Answer any TWO sections out of three\n`;
      questionPaper += `• Each section carries 15 marks\n`;
      questionPaper += `• Total marks: 2 × 15 = 30 marks\n`;
      questionPaper += `• All parts of a question should be answered contiguously\n\n`;
    } else {
      questionPaper += `• Answer any one full question from each module\n`;
      questionPaper += `• Each module carries 20 marks\n`;
      questionPaper += `• All parts of a question should be answered contiguously\n\n`;
    }
    
    questionPaper += `───────────────────────────────────────────────────────────────────────────────\n\n`;
    
    if (examConfig.examType === "CIE") {
      // CIE format
      const sections = [1, 2, 3];
      
      for (const section of sections) {
        questionPaper += `SECTION ${section}\n`;
        questionPaper += `───────────────────────────────────────────────────────────────────────────────\n\n`;
        
        const sectionQuestions = questions.filter(q => 
          q.questionId.startsWith(section.toString())
        );
        
        for (const question of sectionQuestions) {
          const questionPart = question.questionId[1];
          questionPaper += `${section}${questionPart.toUpperCase()}. ${question.text}\n`;
          questionPaper += `    [${question.marks} Marks | ${question.difficulty} | ${question.bloomLevel}]\n`;
          questionPaper += `\n`;
        }
        
        questionPaper += `\n`;
      }
    } else {
      // Semester End format
      const cos = [1, 2, 3, 4, 5];
      
      for (const co of cos) {
        questionPaper += `MODULE ${co} (Course Outcome ${co})\n`;
        questionPaper += `───────────────────────────────────────────────────────────────────────────────\n\n`;
        
        for (let setIdx = 1; setIdx <= 2; setIdx++) {
          const questionNum = (co - 1) * 2 + setIdx;
          
          questionPaper += `Question ${questionNum}:\n`;
          
          const questionSet = questions.filter(q => 
            parseInt(q.questionId) === questionNum
          );
          
          for (const question of questionSet) {
            const questionPart = question.questionId.slice(-1);
            questionPaper += `${questionNum}${questionPart.toUpperCase()}. ${question.text}\n`;
            questionPaper += `    [${question.marks} Marks | ${question.difficulty} | ${question.bloomLevel}]\n`;
            questionPaper += `\n`;
          }
          
          questionPaper += `OR\n\n`;
        }
        
        questionPaper += `\n`;
      }
    }
    
    questionPaper += `═══════════════════════════════════════════════════════════════════════════════\n`;
    questionPaper += `                                   END OF QUESTION PAPER\n`;
    questionPaper += `═══════════════════════════════════════════════════════════════════════════════\n`;
    
    return questionPaper;
  };

  const handleDownload = async () => {
    if (!questionPaperText || !examData) return;
    
    // Track download if paper is saved
    if (savedPaperId) {
      try {
        await questionPaperAPI.trackDownload(savedPaperId);
      } catch (error) {
        console.error('Failed to track download:', error);
      }
    }
    
    const blob = new Blob([questionPaperText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const filename = `${examData.examConfig.examType}_${examData.examConfig.course}_Semester${examData.examConfig.semester}_QuestionPaper.txt`;
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: `Question paper saved as ${filename}`,
    });
  };

  const handleRegenerateQuestions = () => {
    setSavedPaperId(null); // Reset saved paper ID when regenerating
    generateQuestionsWithProcessedData();
  };

  const goBack = () => {
    const backRoute = examData?.examConfig.examType === "CIE" 
      ? "/cie-exam-setup" 
      : "/semester-exam-setup";
      
    navigate(backRoute, { state: examData?.examConfig });
  };

  if (!examData) {
    return (
      <NetworkGridBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Loading...</div>
        </div>
      </NetworkGridBackground>
    );
  }

  return (
    <NetworkGridBackground>
      <div className="min-h-screen">
        <header className="bg-black/40 backdrop-blur-sm border-b border-cyan-500/20 shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
            <Button variant="ghost" size="sm" onClick={goBack} className="mr-4 text-cyan-100 hover:bg-cyan-900/30 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white">AI Question Paper Generation</h1>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">

            {/* Data Source Status */}
            <Card className="bg-black/40 backdrop-blur-sm border-cyan-400/30 shadow-lg">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  {hasProcessedData ? (
                    <>
                      <Database className="h-5 w-5 mr-2 text-green-400" />
                      Latest Question Bank Data Available
                    </>
                  ) : (
                    <>
                      <Bot className="h-5 w-5 mr-2 text-blue-400" />
                      AI Generation Mode
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-cyan-200">Questions Available</p>
                    <p className="text-xl font-bold text-white">{processedQuestions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-cyan-200">Topics Available</p>
                    <p className="text-xl font-bold text-white">{processedTopics.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-cyan-200">Data Source</p>
                    <Badge variant={hasProcessedData ? "default" : "secondary"}>
                      {hasProcessedData ? "Latest Question Bank" : "AI Generation"}
                    </Badge>
                  </div>
                </div>
                
                {hasProcessedData && (
                  <Alert className="mt-4 bg-green-900/20 border-green-500/30">
                    <AlertDescription className="text-green-100">
                      <strong>Using Latest Data:</strong> Questions will be intelligently selected from your most recently uploaded question bank, ensuring you always use the latest syllabus and questions.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Generation Controls */}
            <Card className="bg-black/40 backdrop-blur-sm border-cyan-400/30 shadow-lg">
              <CardHeader>
                <CardTitle className="flex justify-between items-center text-white">
                  <span>Question Paper Generation</span>
                  <div className="flex space-x-2">
                    {questionPaperText && !savedPaperId && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={saveQuestionPaper}
                        disabled={isSaving}
                        className="text-cyan-100 hover:bg-cyan-900/30 hover:text-white border-cyan-500/30"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Paper
                          </>
                        )}
                      </Button>
                    )}
                    {questionPaperText && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleRegenerateQuestions}
                        disabled={isGenerating}
                        className="text-cyan-100 hover:bg-cyan-900/30 hover:text-white border-cyan-500/30"
                      >
                        <Shuffle className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDownload}
                      disabled={!questionPaperText || isGenerating}
                      className="text-cyan-100 hover:bg-cyan-900/30 hover:text-white border-cyan-500/30"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {savedPaperId && (
                  <Alert className="mb-4 bg-green-900/20 border-green-500/30">
                    <AlertDescription className="text-green-100">
                      <strong>✅ Question Paper Saved!</strong> This question paper is now saved to your dashboard and can be accessed anytime.
                    </AlertDescription>
                  </Alert>
                )}

                {!questionPaperText && !isGenerating && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-cyan-400 mb-4" />
                    <p className="text-cyan-100 mb-4">Ready to generate your {examData.examConfig.examType} question paper</p>
                    <Button 
                      onClick={generateQuestionsWithProcessedData}
                      className="bg-cyan-600 hover:bg-cyan-500"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Generate Question Paper
                    </Button>
                  </div>
                )}

                {isGenerating && (
                  <div className="flex flex-col items-center justify-center py-12 text-white space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                    <p className="text-lg font-medium">Generating questions...</p>
                    <div className="w-full max-w-md">
                      <Progress value={generationProgress} className="w-full" />
                      <p className="text-sm text-cyan-200/70 mt-2 text-center">
                        {generationProgress < 40 && "Analyzing configurations..."}
                        {generationProgress >= 40 && generationProgress < 60 && "Matching from latest question bank..."}
                        {generationProgress >= 60 && generationProgress < 80 && "Selecting best questions..."}
                        {generationProgress >= 80 && "Finalizing question paper..."}
                      </p>
                    </div>
                  </div>
                )}

                {questionPaperText && !isGenerating && (
                  <Tabs defaultValue="paper" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="paper">Question Paper</TabsTrigger>
                      <TabsTrigger value="questions">Question Analysis</TabsTrigger>
                      <TabsTrigger value="stats">Generation Stats</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="paper" className="mt-4">
                      <Textarea 
                        value={questionPaperText} 
                        onChange={(e) => setQuestionPaperText(e.target.value)}
                        className="font-mono min-h-[60vh] text-sm bg-black/40 border-cyan-500/30 text-white"
                        placeholder="Generated question paper will appear here..."
                      />
                    </TabsContent>
                    
                    <TabsContent value="questions" className="mt-4">
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {generatedQuestions.map((question, index) => (
                          <Card key={index} className="bg-black/20 border-cyan-500/20">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <Badge variant={question.source === 'processed_data' ? 'default' : 'secondary'}>
                                  {question.source === 'processed_data' ? '📚 From Latest Question Bank' : '🤖 AI Generated'}
                                </Badge>
                                <div className="flex space-x-2">
                                  <Badge variant="outline" className="text-white border-white/30">
                                    {question.marks} marks
                                  </Badge>
                                  <Badge variant="outline" className="text-white border-white/30">
                                    {question.difficulty}
                                  </Badge>
                                  <Badge variant="outline" className="text-white border-white/30">
                                    {question.bloomLevel}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-white mb-2 font-medium">Q{question.questionId}: {question.text}</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                <span className="text-cyan-200">Unit: {question.unit}</span>
                                <span className="text-cyan-200">Topic: {question.topic}</span>
                                {question.co && (
                                  <span className="text-cyan-200">CO: {question.co}</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="stats" className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-black/20 border-cyan-500/20">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-cyan-200">Total Questions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-white">{generatedQuestions.length}</p>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-black/20 border-cyan-500/20">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-cyan-200">From Question Bank</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-green-400">
                              {generatedQuestions.filter(q => q.source === 'processed_data').length}
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-black/20 border-cyan-500/20">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-cyan-200">AI Generated</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-blue-400">
                              {generatedQuestions.filter(q => q.source === 'ai_generated').length}
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-black/20 border-cyan-500/20">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-cyan-200">Total Marks</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-white">
                              {generatedQuestions.reduce((sum, q) => sum + q.marks, 0)}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-white mb-4">Difficulty Distribution</h3>
                        <div className="grid grid-cols-3 gap-4">
                          {['easy', 'medium', 'hard'].map(difficulty => {
                            const count = generatedQuestions.filter(q => q.difficulty === difficulty).length;
                            const percentage = generatedQuestions.length > 0 ? (count / generatedQuestions.length * 100).toFixed(1) : 0;
                            return (
                              <Card key={difficulty} className="bg-black/20 border-cyan-500/20">
                                <CardContent className="p-4 text-center">
                                  <p className="text-sm text-cyan-200 capitalize">{difficulty}</p>
                                  <p className="text-xl font-bold text-white">{count}</p>
                                  <p className="text-xs text-cyan-300">{percentage}%</p>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </NetworkGridBackground>
  );
};

export default GenerateQuestions;