import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { coursesAPI } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, Loader2, Database, ArrowLeft, BookOpen, CheckCircle } from "lucide-react";
import NetworkGridBackground from "@/components/NetworkGridBackground";

interface Course {
  _id: string;
  name: string;
  code: string;
}

interface NavigationState {
  preSelectedCourse?: string;
  hasQuestionBank?: boolean;
  fromUpload?: boolean;
}

const ExamTypeSelection = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [examType, setExamType] = useState<string>("");
  const [semester, setSemester] = useState<string>(currentUser?.semester || "");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State from navigation (from document upload or dashboard)
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const response = await coursesAPI.getAllCourses();
      
      // Filter courses based on currentUser's courses if available
      let availableCourses = response.data;
      if (currentUser?.courses && currentUser.courses.length > 0) {
        availableCourses = response.data.filter((course: Course) => 
          currentUser.courses.includes(course._id)
        );
      }
      
      setCourses(availableCourses);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch courses and handle navigation state when component mounts
  useEffect(() => {
    fetchCourses();
    
    // Check if we came from document upload with pre-selected course
    const state = location.state as NavigationState | null;
    
    if (state) {
      setNavigationState(state);
      if (state.preSelectedCourse) {
        setSelectedCourse(state.preSelectedCourse);
      }
    }
  }, [location.state]);

  const handleContinueToUpload = () => {
    if (!examType) {
      toast({
        title: "Missing Selection",
        description: "Please select an exam type to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!semester) {
      toast({
        title: "Missing Selection",
        description: "Please select a semester to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCourse) {
      toast({
        title: "Missing Selection",
        description: "Please select a course to continue.",
        variant: "destructive",
      });
      return;
    }

    // Create exam configuration and navigate to document upload
    const examConfig = {
      examType,
      semester,
      course: selectedCourse,
      hasQuestionBank: navigationState?.hasQuestionBank || false
    };

    navigate("/upload-documents", {
      state: examConfig
    });
  };

  const handleDirectToSetup = () => {
    if (!examType) {
      toast({
        title: "Missing Selection",
        description: "Please select an exam type to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!semester) {
      toast({
        title: "Missing Selection", 
        description: "Please select a semester to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCourse) {
      toast({
        title: "Missing Selection",
        description: "Please select a course to continue.",
        variant: "destructive",
      });
      return;
    }

    // Get the course ID for the selected course code
    const selectedCourseData = courses.find(c => c.code === selectedCourse);
    if (!selectedCourseData) {
      toast({
        title: "Error",
        description: "Selected course not found.",
        variant: "destructive",
      });
      return;
    }

    // If we already have question bank data, go directly to setup
    const examConfig = {
      examType,
      semester,
      course: selectedCourse,
      courseId: selectedCourseData._id, // Include the actual course ID
      hasQuestionBank: navigationState?.hasQuestionBank || false
    };

    // Navigate directly to appropriate setup page
    if (examType === 'CIE') {
      navigate("/cie-exam-setup", { state: examConfig });
    } else {
      navigate("/semester-exam-setup", { state: examConfig });
    }
  };

  const goBack = () => {
    if (navigationState?.fromUpload || navigationState?.hasQuestionBank) {
      // If we came from document upload, go back there
      navigate("/upload-documents");
    } else {
      // Otherwise go back to dashboard
      navigate("/dashboard");
    }
  };

  const getSelectedCourseData = () => {
    return courses.find(c => c.code === selectedCourse);
  };

  return (
    <NetworkGridBackground>
      <div className="flex items-center justify-center min-h-screen p-4 md:p-8">
        <div className="w-full max-w-4xl">
          <Card className="shadow-xl backdrop-blur-sm bg-black/30 border-cyan-500/30">
            <CardHeader>
              <div className="flex items-center mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={goBack} 
                  className="mr-4 text-cyan-100 hover:bg-cyan-900/30 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex-1">
                  <CardTitle className="text-2xl text-white">Configure Your Exam</CardTitle>
                  <CardDescription className="text-cyan-100">
                    Select exam type, semester, and course to create your question paper
                  </CardDescription>
                </div>
              </div>
              
              {/* Show status if coming from document upload */}
              {navigationState?.hasQuestionBank && (
                <Alert className="bg-green-900/20 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-100">
                    <strong>✅ Question Bank Ready:</strong> Your documents have been processed successfully. 
                    You can now create intelligent question papers using your processed data.
                  </AlertDescription>
                </Alert>
              )}

              {!navigationState?.hasQuestionBank && (
                <Alert className="bg-blue-900/20 border-blue-500/30">
                  <Database className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-100">
                    <strong>ℹ️ Next Step:</strong> After configuration, you'll upload your question bank and syllabus 
                    for AI processing to enable smart question generation.
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Exam Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-100">
                  Exam Type <span className="text-red-400">*</span>
                </label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger className="bg-black/40 border-cyan-500/30 text-white">
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-white border-slate-700">
                    <SelectItem value="CIE">
                      <div className="flex flex-col">
                        <span className="font-medium">Continuous Internal Evaluation (CIE)</span>
                        <span className="text-xs text-cyan-200">3 sections × 15 marks each = 45 marks total</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SEE">
                      <div className="flex flex-col">
                        <span className="font-medium">Semester End Examination (SEE)</span>
                        <span className="text-xs text-cyan-200">5 modules × 20 marks each = 100 marks total</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Semester Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-100">
                  Semester <span className="text-red-400">*</span>
                </label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="bg-black/40 border-cyan-500/30 text-white">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-white border-slate-700">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <SelectItem key={sem} value={sem.toString()}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Course Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-100">
                  Course <span className="text-red-400">*</span>
                </label>
                {isLoading ? (
                  <div className="flex items-center space-x-2 p-3 bg-black/40 rounded-md border border-cyan-500/30">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    <span className="text-cyan-100">Loading courses...</span>
                  </div>
                ) : (
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="bg-black/40 border-cyan-500/30 text-white">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 text-white border-slate-700">
                      {courses.length > 0 ? (
                        courses.map((course) => (
                          <SelectItem key={course._id} value={course.code}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                <span className="font-medium">{course.name}</span>
                                <span className="text-xs text-cyan-200">Course Code: {course.code}</span>
                              </div>
                              {navigationState?.preSelectedCourse === course.code && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Pre-selected
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No courses available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Selected Configuration Summary */}
              {examType && semester && selectedCourse && (
                <div className="mt-6 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-md">
                  <h3 className="text-sm font-medium text-cyan-100 mb-3">📋 Configuration Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-cyan-200">Exam Type</p>
                      <p className="text-white font-medium">{examType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-cyan-200">Semester</p>
                      <p className="text-white font-medium">Semester {semester}</p>
                    </div>
                    <div>
                      <p className="text-xs text-cyan-200">Course</p>
                      <p className="text-white font-medium">
                        {getSelectedCourseData()?.name} ({selectedCourse})
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <div className="w-full space-y-3">
                {navigationState?.hasQuestionBank ? (
                  // If processed data is available, show direct setup option
                  <div className="space-y-2">
                    <Button 
                      onClick={handleDirectToSetup} 
                      disabled={!examType || !semester || !selectedCourse}
                      className="w-full bg-green-600 hover:bg-green-500 text-white"
                      size="lg"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Create Question Paper
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-xs text-center text-cyan-200">
                      Using your processed question bank data
                    </p>
                  </div>
                ) : (
                  // If no processed data, show upload flow
                  <div className="space-y-2">
                    <Button 
                      onClick={handleContinueToUpload} 
                      disabled={!examType || !semester || !selectedCourse}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                      size="lg"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Continue to Upload Documents
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-xs text-center text-cyan-200">
                      Next: Upload question bank and syllabus for AI processing
                    </p>
                  </div>
                )}
              </div>

              {/* Additional Options */}
              {navigationState?.hasQuestionBank && (
                <div className="w-full pt-2 border-t border-cyan-500/20">
                  <Button 
                    variant="outline"
                    onClick={handleContinueToUpload} 
                    disabled={!examType || !semester || !selectedCourse}
                    className="w-full bg-transparent border-cyan-500/50 text-cyan-100 hover:bg-cyan-900/30"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Upload New Documents Instead
                  </Button>
                  <p className="text-xs text-center text-cyan-300 mt-1">
                    Process new question bank and syllabus files
                  </p>
                </div>
              )}

              {/* Validation Messages */}
              {(!examType || !semester || !selectedCourse) && (
                <Alert className="bg-yellow-900/20 border-yellow-500/30">
                  <AlertDescription className="text-yellow-100 text-sm">
                    <strong>⚠️ Required:</strong> Please select all fields marked with * to continue.
                  </AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>

          {/* Additional Information Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-black/20 border-cyan-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-200">CIE Format</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-cyan-100">
                <ul className="space-y-1">
                  <li>• 3 Sections (Unit-wise)</li>
                  <li>• 15 marks per section</li>
                  <li>• Duration: 1.5 hours</li>
                  <li>• Answer all questions</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-black/20 border-cyan-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-200">SEE Format</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-cyan-100">
                <ul className="space-y-1">
                  <li>• 5 Modules (CO-wise)</li>
                  <li>• 20 marks per module</li>
                  <li>• Duration: 3 hours</li>
                  <li>• Answer one from each module</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </NetworkGridBackground>
  );
};

export default ExamTypeSelection;