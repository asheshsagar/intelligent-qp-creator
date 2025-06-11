// src/pages/Dashboard.tsx - Complete Enhanced Dashboard with Question Papers and Logout

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { coursesAPI, examsAPI, uploadAPI, questionPaperAPI } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  BookOpen, 
  AlarmClock, 
  FileText, 
  PenLine, 
  LogOut, 
  Upload, 
  Database, 
  TrendingUp,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  User,
  Download,
  Eye,
  Trash2
} from "lucide-react";
import NetworkGridBackground from "@/components/NetworkGridBackground";

interface Course {
  _id: string;
  name: string;
  code: string;
}

interface Exam {
  _id: string;
  examType: string;
  semester: string;
  course: Course;
  createdAt: string;
  status?: string;
}

interface ProcessedUpload {
  processId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  course: Course;
  questionsCount: number;
  topicsCount: number;
  processedAt?: string;
  createdAt: string;
  uploadedAt: string;
  version: number;
  isActive: boolean;
  originalFileNames?: {
    questionBank: string;
    syllabus: string;
  };
}

interface QuestionPaper {
  _id: string;
  course: Course;
  examType: string;
  semester: string;
  title: string;
  totalMarks: number;
  totalQuestions: number;
  generationSource: string;
  downloadCount: number;
  lastDownloadedAt?: string;
  createdAt: string;
}

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [uploads, setUploads] = useState<ProcessedUpload[]>([]);
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExams: 0,
    totalUploads: 0,
    completedUploads: 0,
    totalQuestions: 0,
    totalQuestionPapers: 0,
    totalDownloads: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all data in parallel
        const [coursesResponse, examsResponse, uploadsResponse, questionPapersResponse] = await Promise.all([
          coursesAPI.getAllCourses().catch(() => ({ data: [] })),
          examsAPI.getEducatorExams().catch(() => ({ data: [] })),
          uploadAPI.getMyUploads().catch(() => ({ data: [] })),
          questionPaperAPI.getMyQuestionPapers().catch(() => ({ data: [] }))
        ]);

        setCourses(coursesResponse.data);
        setExams(examsResponse.data);
        setUploads(uploadsResponse.data);
        setQuestionPapers(questionPapersResponse.data);

        // Calculate statistics
        const completedUploads = uploadsResponse.data.filter((u: ProcessedUpload) => u.status === 'COMPLETED');
        const totalQuestions = completedUploads.reduce((sum: number, u: ProcessedUpload) => sum + u.questionsCount, 0);
        const totalDownloads = questionPapersResponse.data.reduce((sum: number, p: QuestionPaper) => sum + p.downloadCount, 0);

        setStats({
          totalExams: examsResponse.data.length,
          totalUploads: uploadsResponse.data.length,
          completedUploads: completedUploads.length,
          totalQuestions,
          totalQuestionPapers: questionPapersResponse.data.length,
          totalDownloads
        });

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Warning",
          description: "Some data could not be loaded. Basic functionality is still available.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  const handleCreateExam = () => {
    navigate("/exam-type-selection");
  };

  const handleUploadDocuments = () => {
    navigate("/upload-documents");
  };

  const handleViewExam = (examId: string) => {
    // Navigate to exam details (you can implement this later)
    toast({
      title: "Feature coming soon",
      description: "Exam details view will be available in the next update.",
    });
  };

  const handleUseUploadData = (upload: ProcessedUpload) => {
    navigate("/exam-type-selection", {
      state: {
        preSelectedCourse: upload.course.code,
        hasQuestionBank: true,
        fromUpload: true
      }
    });
  };

  const handleViewQuestionPaper = (paper: QuestionPaper) => {
    // You can implement a detailed view later
    toast({
      title: "Feature coming soon",
      description: "Question paper detailed view will be available in the next update.",
    });
  };

  const handleDeleteQuestionPaper = async (paperId: string) => {
    try {
      await questionPaperAPI.deleteQuestionPaper(paperId);
      setQuestionPapers(prev => prev.filter(p => p._id !== paperId));
      toast({
        title: "Question paper deleted",
        description: "The question paper has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete question paper. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'FAILED':
        return <Clock className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getGenerationSourceIcon = (source: string) => {
    switch (source) {
      case 'processed_data':
        return <Database className="h-4 w-4 text-green-400" />;
      case 'ai_generated':
        return <PenLine className="h-4 w-4 text-blue-400" />;
      case 'hybrid':
        return <BarChart3 className="h-4 w-4 text-purple-400" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <NetworkGridBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-black/40 backdrop-blur-sm p-8 rounded-lg border border-cyan-500/30">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
            <span className="mt-4 block text-white text-center">Loading your dashboard...</span>
          </div>
        </div>
      </NetworkGridBackground>
    );
  }

  return (
    <NetworkGridBackground>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between backdrop-blur-sm bg-black/40 p-6 rounded-lg border border-cyan-500/20">
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome back, {currentUser?.name}! 👋</h1>
              <p className="text-cyan-200 mt-1">
                Ready to create intelligent question papers? Let's get started.
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/profile")}
                className="bg-transparent border-cyan-500/50 text-cyan-100 hover:bg-cyan-900/30"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                className="bg-transparent border-red-500/50 text-red-100 hover:bg-red-900/30"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-black/40 border-cyan-400/30 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-cyan-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-cyan-200">Total Exams</p>
                    <p className="text-2xl font-bold text-white">{stats.totalExams}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-green-400/30 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-200">Question Banks</p>
                    <p className="text-2xl font-bold text-white">{stats.completedUploads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-400/30 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-purple-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-200">Total Questions</p>
                    <p className="text-2xl font-bold text-white">{stats.totalQuestions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-yellow-400/30 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-200">My Courses</p>
                    <p className="text-2xl font-bold text-white">{currentUser?.courses?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-pink-400/30 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <PenLine className="h-8 w-8 text-pink-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-pink-200">Question Papers</p>
                    <p className="text-2xl font-bold text-white">{stats.totalQuestionPapers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-orange-400/30 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Download className="h-8 w-8 text-orange-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-200">Downloads</p>
                    <p className="text-2xl font-bold text-white">{stats.totalDownloads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator className="bg-cyan-500/20" />

          {/* Main Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Create New Exam Card */}
            <Card className="bg-black/40 border-cyan-400/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <PenLine className="mr-3 h-6 w-6 text-cyan-400" />
                  Create New Question Paper
                </CardTitle>
                <CardDescription className="text-cyan-200">
                  Generate CIE or SEE question papers with AI assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-cyan-100 mb-4">
                  Choose between <strong>Continuous Internal Evaluation (CIE)</strong> or 
                  <strong> Semester End Examination (SEE)</strong> to create customized question papers 
                  tailored to your course requirements.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-cyan-200 border-cyan-500/30">CIE Format</Badge>
                  <Badge variant="outline" className="text-cyan-200 border-cyan-500/30">SEE Format</Badge>
                  <Badge variant="outline" className="text-cyan-200 border-cyan-500/30">AI Powered</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleCreateExam} className="w-full bg-cyan-600 hover:bg-cyan-500" size="lg">
                  <PenLine className="w-4 h-4 mr-2" />
                  Start Creating Exam
                </Button>
              </CardFooter>
            </Card>

            {/* Upload Documents Card */}
            <Card className="bg-black/40 border-green-400/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Upload className="mr-3 h-6 w-6 text-green-400" />
                  Upload Question Bank
                </CardTitle>
                <CardDescription className="text-green-200">
                  Process your documents with AI for intelligent question selection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-green-100 mb-4">
                  Upload your <strong>question bank</strong> and <strong>syllabus PDFs</strong> to enable 
                  smart question selection based on difficulty, topics, and Bloom taxonomy levels.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-green-200 border-green-500/30">PDF Processing</Badge>
                  <Badge variant="outline" className="text-green-200 border-green-500/30">ML Analysis</Badge>
                  <Badge variant="outline" className="text-green-200 border-green-500/30">Smart Selection</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleUploadDocuments} className="w-full bg-green-600 hover:bg-green-500" size="lg">
                  <Database className="w-4 h-4 mr-2" />
                  Upload & Process Documents
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* My Courses */}
            <Card className="bg-black/40 border-cyan-400/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <BookOpen className="mr-2 h-5 w-5 text-cyan-400" />
                  My Courses
                </CardTitle>
                <CardDescription className="text-cyan-200">Courses you're teaching</CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser?.courses?.length > 0 ? (
                  <div className="space-y-3">
                    {currentUser.courses.slice(0, 3).map((courseId: string) => {
                      const course = courses.find(c => c._id === courseId);
                      return (
                        <div key={courseId} className="flex items-center justify-between p-3 bg-black/30 rounded-md border border-cyan-500/20">
                          <div>
                            <p className="text-white font-medium">
                              {course ? course.name : 'Unknown Course'}
                            </p>
                            <p className="text-sm text-cyan-200">
                              {course ? `Code: ${course.code}` : 'No code available'}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        </div>
                      );
                    })}
                    {currentUser.courses.length > 3 && (
                      <p className="text-sm text-cyan-300 text-center">
                        +{currentUser.courses.length - 3} more courses
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BookOpen className="h-12 w-12 mx-auto text-cyan-400/50 mb-2" />
                    <p className="text-cyan-200">No courses assigned yet</p>
                    <p className="text-sm text-cyan-300">Contact admin to assign courses</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Question Papers */}
            <Card className="bg-black/40 border-pink-400/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <PenLine className="mr-2 h-5 w-5 text-pink-400" />
                  Question Papers
                </CardTitle>
                <CardDescription className="text-pink-200">Your saved question papers</CardDescription>
              </CardHeader>
              <CardContent>
                {questionPapers.length > 0 ? (
                  <div className="space-y-3">
                    {questionPapers.slice(0, 4).map((paper) => (
                      <div 
                        key={paper._id} 
                        className="p-3 bg-black/30 rounded-md border border-pink-500/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getGenerationSourceIcon(paper.generationSource)}
                            <div>
                              <p className="font-medium text-white text-sm">
                                {paper.examType} - {paper.course.code}
                              </p>
                              <p className="text-xs text-pink-200">
                                Semester {paper.semester} • {getTimeAgo(paper.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewQuestionPaper(paper)}
                              className="h-6 w-6 p-0 text-pink-300 hover:text-white"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteQuestionPaper(paper._id)}
                              className="h-6 w-6 p-0 text-red-300 hover:text-red-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-pink-200">
                          <span>{paper.totalQuestions} questions</span>
                          <span>{paper.totalMarks} marks</span>
                          <span>{paper.downloadCount} downloads</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <PenLine className="h-12 w-12 mx-auto text-pink-400/50 mb-2" />
                    <p className="text-pink-200">No question papers saved</p>
                    <p className="text-sm text-pink-300">Create and save question papers</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Exams */}
            <Card className="bg-black/40 border-cyan-400/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <AlarmClock className="mr-2 h-5 w-5 text-cyan-400" />
                  Recent Exams
                </CardTitle>
                <CardDescription className="text-cyan-200">Your recently created exams</CardDescription>
              </CardHeader>
              <CardContent>
                {exams.length > 0 ? (
                  <div className="space-y-3">
                    {exams.slice(0, 4).map((exam) => (
                      <div 
                        key={exam._id} 
                        className="p-3 bg-black/30 rounded-md border border-cyan-500/20 hover:bg-black/40 transition-colors cursor-pointer"
                        onClick={() => handleViewExam(exam._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">
                              {exam.examType} - {exam.course.code}
                            </p>
                            <p className="text-sm text-cyan-200">
                              Semester {exam.semester} • {getTimeAgo(exam.createdAt)}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-cyan-200 border-cyan-500/30">
                            {exam.examType}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="h-12 w-12 mx-auto text-cyan-400/50 mb-2" />
                    <p className="text-cyan-200">No exams created yet</p>
                    <p className="text-sm text-cyan-300">Create your first exam to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processed Question Banks */}
            <Card className="bg-black/40 border-green-400/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Database className="mr-2 h-5 w-5 text-green-400" />
                  Question Banks
                </CardTitle>
                <CardDescription className="text-green-200">Your processed documents</CardDescription>
              </CardHeader>
              <CardContent>
                {uploads.length > 0 ? (
                  <div className="space-y-3">
                    {uploads.slice(0, 4).map((upload) => (
                      <div key={upload.processId} className="p-3 bg-black/30 rounded-md border border-green-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(upload.status)}
                            <div>
                              <p className="font-medium text-white text-sm">
                                {upload.course.name}
                              </p>
                              <p className="text-xs text-green-200">
                                {upload.isActive && <Badge variant="secondary" className="text-xs mr-1">Latest</Badge>}
                                v{upload.version} • {getTimeAgo(upload.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <Badge variant={upload.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-xs">
                            {upload.status}
                          </Badge>
                        </div>
                        {upload.status === 'COMPLETED' && (
                          <>
                            <p className="text-xs text-green-200 mb-2">
                              {upload.questionsCount} questions • {upload.topicsCount} topics
                            </p>
                            <Button 
                              size="sm" 
                              onClick={() => handleUseUploadData(upload)}
                              className="w-full bg-green-600 hover:bg-green-500 text-xs"
                            >
                              Create Question Paper
                            </Button>
                          </>
                        )}
                        {upload.status === 'PROCESSING' && (
                          <p className="text-xs text-yellow-200">Processing documents...</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Upload className="h-12 w-12 mx-auto text-green-400/50 mb-2" />
                    <p className="text-green-200">No documents uploaded</p>
                    <p className="text-sm text-green-300">Upload question bank to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* User Information */}
          <Card className="bg-black/40 border-cyan-400/30 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">Your Information</CardTitle>
              <CardDescription className="text-cyan-200">Your educator profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-cyan-300">Full Name</h3>
                  <p className="text-white mt-1">{currentUser?.name || 'Not available'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-cyan-300">Email Address</h3>
                  <p className="text-white mt-1">{currentUser?.email || 'Not available'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-cyan-300">Department</h3>
                  <p className="text-white mt-1">{currentUser?.department || 'Not available'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-cyan-300">Default Semester</h3>
                  <p className="text-white mt-1">Semester {currentUser?.semester || 'Not set'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Alert className="bg-blue-900/20 border-blue-500/30">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-100">
              <strong>💡 Pro Tip:</strong> Upload your question bank and syllabus first to enable smart question selection. 
              The AI will analyze your documents and suggest the most relevant questions based on difficulty, topics, and learning objectives.
              Your saved question papers are displayed above and can be downloaded anytime!
            </AlertDescription>
          </Alert>

          {/* Logout Section */}
          <Card className="bg-black/40 border-red-400/30 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <LogOut className="mr-2 h-5 w-5 text-red-400" />
                Session Management
              </CardTitle>
              <CardDescription className="text-red-200">
                Securely end your current session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white mb-1">Ready to sign out?</p>
                  <p className="text-sm text-red-200">
                    Make sure you've saved all your work before logging out.
                  </p>
                </div>
                <Button 
                  onClick={handleLogout}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-500"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout Safely
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </NetworkGridBackground>
  );
};

export default Dashboard;