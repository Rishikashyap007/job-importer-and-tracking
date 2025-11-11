import axios from "axios";

const api = axios.create({
  baseURL: "https://job-importer-and-tracking.onrender.com/api" ,
});

export default api;
