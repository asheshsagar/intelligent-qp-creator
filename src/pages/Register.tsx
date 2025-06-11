// src/pages/Register.tsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { coursesAPI } from "@/lib/api";
import NetworkGridBackground from "@/components/NetworkGridBackground";

interface Course {
  _id: string;
  name: string;
  code: string;
}

const Register = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch available courses when going to step 2
  const goToStep2 = async () => {
    if (!name || !email || !password) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields to continue.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoadingCourses(true);
      const response = await coursesAPI.getAllCourses();
      setAvailableCourses(response.data);
      setStep(2);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleCourseToggle = (courseCode: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseCode)) {
        return prev.filter(code => code !== courseCode);
      } else {
        return [...prev, courseCode];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!department || !semester || selectedCourses.length === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select at least one course.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const success = await register({
        name,
        email,
        password,
        department,
        semester,
        courses: selectedCourses,
      });
      
      if (success) {
        toast({
          title: "Registration successful",
          description: "Your account has been created. You can now log in.",
        });
        navigate("/login");
      } else {
        toast({
          title: "Registration failed",
          description: "Failed to create your account. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <NetworkGridBackground>
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-4">
          <Card className="shadow-xl backdrop-blur-sm bg-black/30 border-cyan-500/30">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-white">Exam-Scribe AI</CardTitle>
              <CardDescription className="text-center text-cyan-100">
                {step === 1 ? "Create an educator account" : "Complete your profile"}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {step === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-cyan-100">Full Name</Label>
                    <Input 
                      id="name"
                      type="text" 
                      placeholder="Enter your name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-black/40 border-cyan-500/30 text-white placeholder:text-cyan-200/40 focus-visible:ring-cyan-500/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-cyan-100">Email</Label>
                    <Input 
                      id="email"
                      type="email" 
                      placeholder="your.email@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-black/40 border-cyan-500/30 text-white placeholder:text-cyan-200/40 focus-visible:ring-cyan-500/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-cyan-100">Password</Label>
                    <Input 
                      id="password"
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-black/40 border-cyan-500/30 text-white placeholder:text-cyan-200/40 focus-visible:ring-cyan-500/50"
                    />
                    <p className="text-xs text-cyan-200/70">
                      Password must be at least 6 characters long.
                    </p>
                  </div>
                  
                  <Button 
                    type="button" 
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white" 
                    onClick={goToStep2}
                    disabled={isLoadingCourses}
                  >
                    {isLoadingCourses ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-cyan-100">Department</Label>
                    <Select 
                      value={department} 
                      onValueChange={setDepartment}
                      required
                    >
                      <SelectTrigger id="department" className="bg-black/40 border-cyan-500/30 text-white">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border-slate-700">
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                        <SelectItem value="Computer Science(Ai & ML)">Computer Science(Ai & ML)</SelectItem>
                        <SelectItem value="Information Science Engineering">Information Technology</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                        <SelectItem value="Mechanical">Mechanical</SelectItem>
                        <SelectItem value="Civil">Civil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="semester" className="text-cyan-100">Semester</Label>
                    <Select 
                      value={semester} 
                      onValueChange={setSemester}
                      required
                    >
                      <SelectTrigger id="semester" className="bg-black/40 border-cyan-500/30 text-white">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border-slate-700">
                        <SelectItem value="1">Semester 1</SelectItem>
                        <SelectItem value="2">Semester 2</SelectItem>
                        <SelectItem value="3">Semester 3</SelectItem>
                        <SelectItem value="4">Semester 4</SelectItem>
                        <SelectItem value="5">Semester 5</SelectItem>
                        <SelectItem value="6">Semester 6</SelectItem>
                        <SelectItem value="7">Semester 7</SelectItem>
                        <SelectItem value="8">Semester 8</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-cyan-100">Select Courses</Label>
                    <div className="border border-white/20 rounded-md p-4 space-y-2 bg-black/30">
                      {availableCourses.map((course) => (
                        <div key={course._id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`course-${course.code}`}
                            checked={selectedCourses.includes(course.code)}
                            onCheckedChange={() => handleCourseToggle(course.code)}
                            className="border-white/50 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                          />
                          <Label htmlFor={`course-${course.code}`} className="flex-1 text-cyan-100 cursor-pointer">
                            {course.name} ({course.code})
                          </Label>
                        </div>
                      ))}
                      {availableCourses.length === 0 && (
                        <p className="text-sm text-cyan-200/70">No courses available</p>
                      )}
                    </div>
                    <p className="text-xs text-cyan-200/70">
                      Please select at least one course that you teach.
                    </p>
                  </div>
                  
                  <div className="pt-4 flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 bg-transparent border-white/30 text-white hover:bg-white/10"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-2">
              <div className="text-sm text-center text-cyan-100">
                Already have an account?{" "}
                <Link to="/login" className="text-cyan-400 hover:underline">
                  Log in
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </NetworkGridBackground>
  );
};

export default Register;