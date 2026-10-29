# 🎓 AI Course Builder

An AI-powered web application that helps users create personalized courses and educational content using artificial intelligence.

## 🚀 Overview

AI Course Builder allows users to generate structured courses based on their chosen topics. It combines AI-generated lesson content, web research, authentication, and course management in one application.

The project is built using the MERN-related web technologies, with React for the frontend, Node.js and Express for the backend, and MongoDB Atlas for data storage.

## ✨ Features

- **AI-Powered Course Generation:** Generate structured courses and lessons using Groq AI.
- **Lesson Content Generation:** Create lesson summaries, key points, and educational scripts.
- **Web Research Integration:** Retrieve supporting information using SearXNG.
- **User Authentication:** Register, log in, and manage authenticated sessions.
- **Course Management:** Save and access generated courses.
- **YouTube Video Integration:** Find relevant YouTube videos for lessons.
- **AI Text-to-Speech:** Generate lesson narration using Google's Gemini API.
- **Educational Video Generation:** Generate narrated educational videos using Shotstack.
- **Cloud Audio Storage:** Upload generated audio to Cloudinary.
- **MongoDB Atlas Integration:** Store application data in a cloud database.
- **Responsive User Interface:** Access the application through a React-based interface.

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- Axios
- React Router
- Lucide React

### Backend
- Node.js
- Express.js
- Mongoose
- Passport.js
- Passport Local Mongoose
- Express Session

### Database
- MongoDB Atlas

### AI and External Services
- Groq API
- Google Gemini API
- SearXNG
- YouTube integration
- Shotstack
- Cloudinary

## 📁 Project Structure

```text
AI-Course-Builder/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

*Note: The folder structure above is illustrative. Adjust it to match your actual project.*

## ⚙️ Installation and Setup

### Prerequisites

Install the following before running the project:

- Node.js and npm
- MongoDB Atlas account
- Git
- API credentials for the services you want to use

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd AI-Course-Builder
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Backend Environment Variables

Create a `.env` file inside the `backend` folder.

Add the environment variables required by your application:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
SESSION_SECRET=your_session_secret
GROQ_API_KEY=your_groq_api_key
```

Add other variables required by the integrations you use, such as Gemini, Cloudinary, Shotstack, and SearXNG.

**Security:** Never commit your `.env` file or publish API keys, database passwords, or session secrets.

### 4. Start the Backend

Run the command supported by your backend's `package.json`. If the scripts are configured as shown below, use:

```bash
npm run dev
```

Or start the production server using:

```bash
npm start
```

### 5. Install Frontend Dependencies

Open a new terminal from the project root:

```bash
cd frontend
npm install
```

### 6. Start the Frontend

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

## 🌐 Deployment

The application can be deployed using GitHub and Render.

### Backend Deployment
1. Push the project to GitHub.
2. Create a Render Web Service connected to the repository.
3. Set the backend root directory to `backend`.
4. Configure the build command as `npm install`.
5. Configure the start command according to your backend scripts, for example `npm start`.
6. Add all required environment variables in Render.
7. Configure production CORS and session-cookie settings.

### Frontend Deployment
1. Create a Render Static Site connected to the same repository.
2. Set the frontend root directory to `frontend`.
3. Set the build command to `npm install && npm run build`.
4. Set the publish directory to `dist`.
5. Configure the frontend API URL to point to the deployed backend.
6. Redeploy the frontend after updating its environment variables.

Deployment configuration may need adjustments to match your actual project structure and authentication setup.

## 🔐 Security

- Keep API keys and database credentials in environment variables.
- Never commit `.env` files.
- Use HTTPS in production.
- Restrict MongoDB Atlas network access appropriately.
- Configure session cookies and CORS for the deployed domains.
- Do not expose secret credentials in frontend code.

## 🎯 Project Objective

The objective of AI Course Builder is to simplify personalized learning by combining AI-powered course creation, lesson research, audio narration, and educational video generation in one web application.

## 🔮 Future Improvements

- Export courses and lessons as PDF documents.
- Add course progress tracking and completion statistics.
- Support more AI models and research providers.
- Improve educational video layouts and animations.
- Add quizzes and assessments for generated lessons.
- Enhance course personalization based on user preferences.

## 👨‍💻 Author

**Vedant Sharma**

Computer Science and Engineering

## 📄 License

Choose a license before distributing this project publicly. If you intend to use an open-source license, add the corresponding `LICENSE` file to the repository.
