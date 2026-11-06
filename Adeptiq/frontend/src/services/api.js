import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:5000/api";

const api = axios.create({
baseURL: API_BASE_URL,
timeout: 15000,
headers: {
"Content-Type": "application/json",
},
});

// Attach JWT token to protected API requests.
api.interceptors.request.use(
(config) => {
const token = localStorage.getItem("learnadapt_token");

if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}

return config;

},
(error) => Promise.reject(error)
);

// Handle API errors without redirecting away from login/signup forms.
api.interceptors.response.use(
(response) => response,
(error) => {
const currentPath = window.location.pathname;
const status = error.response?.status;

// Clear invalid sessions on protected pages.
// Never redirect from the login or signup forms due to a 401.
if (
  status === 401 &&
  currentPath !== "/login" &&
  currentPath !== "/signup"
) {
  localStorage.removeItem("learnadapt_token");
  localStorage.removeItem("learnadapt_user");

  window.location.replace("/login");
}

return Promise.reject(error);

}
);

export default api;
