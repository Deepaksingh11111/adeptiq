import {
BrowserRouter,
Routes,
Route,
Navigate,
} from "react-router-dom";

// Public Pages
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Student Pages
import StudentDashboard from "./pages/StudentDashboard";
import StudentClass from "./pages/StudentClass";
import StudentSubject from "./pages/StudentSubject";
import StudentTopic from "./pages/StudentTopic";
import StudentMaterial from "./pages/StudentMaterial";
import StudentQuiz from "./pages/StudentQuiz";
import StudentResults from "./pages/StudentResults";

// Teacher Pages
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherSubjects from "./pages/TeacherSubjects";
import TeacherTopics from "./pages/TeacherTopics";
import TeacherMaterial from "./pages/TeacherMaterial";
import TeacherQuiz from "./pages/TeacherQuiz";

function ProtectedRoute({ children, allowedRole }) {
const token = localStorage.getItem("learnadapt_token");
const savedUser = localStorage.getItem("learnadapt_user");

if (!token) {
return <Navigate to="/login" replace />;
}

let user = null;

try {
user = savedUser ? JSON.parse(savedUser) : null;
} catch {
localStorage.removeItem("learnadapt_token");
localStorage.removeItem("learnadapt_user");

return <Navigate to="/login" replace />;


}

if (allowedRole && user?.role !== allowedRole) {
if (user?.role === "student") {
return <Navigate to="/student/dashboard" replace />;
}

if (user?.role === "teacher") {
  return <Navigate to="/teacher/dashboard" replace />;
}

localStorage.removeItem("learnadapt_token");
localStorage.removeItem("learnadapt_user");

return <Navigate to="/login" replace />;


}

return children;
}

function App() {
return ( <BrowserRouter> <Routes>
{/* Public Pages */}
<Route path="/" element={<LandingPage />} />

    <Route path="/login" element={<Login />} />

    {/* Signup must remain a public route */}
    <Route path="/signup" element={<Signup />} />

    {/* Student Dashboard */}
    <Route
      path="/student/dashboard"
      element={
        <ProtectedRoute allowedRole="student">
          <StudentDashboard />
        </ProtectedRoute>
      }
    />

    {/* Student Classes */}
    <Route
      path="/student/classes/:classId"
      element={
        <ProtectedRoute allowedRole="student">
          <StudentClass />
        </ProtectedRoute>
      }
    />

    {/* Student Subjects */}
    <Route
      path="/student/subjects/:subjectId"
      element={
        <ProtectedRoute allowedRole="student">
          <StudentSubject />
        </ProtectedRoute>
      }
    />

    {/* Student Topics */}
    <Route
      path="/student/topics/:topicId"
      element={
        <ProtectedRoute allowedRole="student">
          <StudentTopic />
        </ProtectedRoute>
      }
    />

    {/* Student Materials */}
    <Route
      path="/student/materials/:materialId"
      element={
        <ProtectedRoute allowedRole="student">
          <StudentMaterial />
        </ProtectedRoute>
      }
    />

    {/* Student Quizzes */}
    <Route
      path="/student/quizzes/:quizId"
      element={
        <ProtectedRoute allowedRole="student">
          <StudentQuiz />
        </ProtectedRoute>
      }
    />

    {/* Student Results */}
    <Route
      path="/student/results"
      element={
        <ProtectedRoute allowedRole="student">
          <StudentResults />
        </ProtectedRoute>
      }
    />

    {/* Teacher Dashboard */}
    <Route
      path="/teacher/dashboard"
      element={
        <ProtectedRoute allowedRole="teacher">
          <TeacherDashboard />
        </ProtectedRoute>
      }
    />

    {/* Teacher Subjects */}
    <Route
      path="/teacher/classes/:classId/subjects"
      element={
        <ProtectedRoute allowedRole="teacher">
          <TeacherSubjects />
        </ProtectedRoute>
      }
    />

    {/* Teacher Topics */}
    <Route
      path="/teacher/subjects/:subjectId/topics"
      element={
        <ProtectedRoute allowedRole="teacher">
          <TeacherTopics />
        </ProtectedRoute>
      }
    />

    {/* Teacher Materials */}
    <Route
      path="/teacher/topics/:topicId/materials"
      element={
        <ProtectedRoute allowedRole="teacher">
          <TeacherMaterial />
        </ProtectedRoute>
      }
    />

    {/* Teacher Quizzes */}
    <Route
      path="/teacher/quizzes"
      element={
        <ProtectedRoute allowedRole="teacher">
          <TeacherQuiz />
        </ProtectedRoute>
      }
    />

    {/* Unknown URL */}
    <Route
      path="*"
      element={<Navigate to="/" replace />}
    />
  </Routes>
</BrowserRouter>

);
}

export default App;
