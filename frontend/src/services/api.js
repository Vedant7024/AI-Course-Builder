import axios from "axios";

const api = axios.create({
  baseURL: "https://ai-course-builder-backend-6q1n.onrender.com/api",
  withCredentials: true,
});

export default api;