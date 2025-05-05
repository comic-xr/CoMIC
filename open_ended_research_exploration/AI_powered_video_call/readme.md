This repository contains the complete code for AI-Powered WebRTC Video Call Application for Online Education.

Project Structure  
The following outlines the backend and frontend structure for the WebAI application

<pre>

|-- backend  
|   |-- .env                          # Backend environment variables  
|   |-- dump.rdb                      # Redis dump file  
|   |-- index.js                      # Entry point for backend server  
|   |-- src/  
|   |   |-- controllers/  
|   |   |   |-- dynamoDB_controller.js   # Handles DynamoDB logic  
|   |   |   |-- meeting_controller.js    # Manages meeting routes  
|   |   |   |-- openai_controller.js     # Interfaces with OpenAI API  
|   |   |-- routes/  
|   |   |   |-- meeting_room.js          # Endpoints for meeting rooms  
|   |   |   |-- openai.js                # OpenAI endpoint routing  
|   |   |-- services/  
|   |       |-- awsDynamoDB.js           # AWS DynamoDB service logic  
|   |       |-- openai.js                # OpenAI utility functions  
|   |       |-- redis.js                 # Redis helper functions  

|-- frontend/  
|   |-- .env                            # Frontend environment variables  
|   |-- .eslintrc.cjs                   # ESLint config  
|   |-- .gitignore                      # Git ignore rules  
|   |-- App.css                         # Global styles  
|   |-- App.tsx                         # Main React component  
|   |-- index.css                       # Global stylesheet  
|   |-- main.tsx                        # React entry point  
|   |-- vite-env.d.ts                   # Vite environment types  
|   |-- public/  
|   |   |-- audioProcessor.js           # Audio processing logic  
|   |   |-- vite.svg                    # Static Vite logo  
|   |-- src/  
|       |-- assets/  
|       |   |-- .gitkeep                # Keeps assets folder in Git  
|       |   |-- placeholder.jpg         # Placeholder image  
|       |-- components/  
|       |   |-- ChatBox.tsx             # Chat UI container  
|       |   |-- ChatInput.tsx           # Chat input field  
|       |   |-- ChatMessage.tsx         # Chat message renderer  
|       |-- constants/  
|       |   |-- colors.ts               # App color constants  
|       |-- features/  
|       |   |-- auth/                   # Authentication logic  
|       |   |-- rtcSlice.ts             # Redux slice for RTC state  
|       |-- hooks/  
|       |   |-- useTranscribe.ts        # Custom transcription hook  
|       |-- pages/  
|       |   |-- error.tsx               # Error fallback page  
|       |   |-- home.tsx                # Landing page  
|       |   |-- meeting.tsx             # Video meeting page  
|       |-- services/  
|       |   |-- initialize.tsx          # Init logic  
|       |   |-- meeting.tsx             # Meeting utilities  
|       |   |-- sdp.tsx                 # SDP helpers  
|       |   |-- socket.tsx              # Socket.io client  
|       |   |-- transcribe.ts           # Transcription service  
|       |-- shared/  
|       |   |-- button.tsx              # Reusable button component  
|       |   |-- loading.tsx             # Loader/spinner  
|       |   |-- navbar.tsx              # App navigation bar  
|       |-- store/  
|           |-- store.ts                # Redux store setup 
</pre>



Commands to run:

Terminal 1 [Redis]: redis-server  
Terminal 2 [Backend]: npm run dev  
Terminal 3: [Frontend]: npm run dev

DynamoDB Local Installation:

- Download DynamoDB Local from - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html
- Unzip
- Run cmd : java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb

Path - /Users/sruthi/Downloads/Spring\ 2025/WebRTC/dynamodb-local/dynamodb_local_latest

aws dynamodb describe-table --table-name TranscriptionStore --endpoint-url http://localhost:8000

aws dynamodb scan --table-name TranscriptionStore --endpoint-url http://localhost:8000 --output table

Environmental Variables:

REDIS_URL=localhost  
REDIS_PORT=6379  
PORT=3000  
DYNAMO_DB_ACCESS_ID=fake  
DYNAMO_DB_SECRET_KEY=fake  
AWS_REGION=us-east-2  
DYNAMO_DB_ENDPOINT=http://localhost:8000  
OPENAI_API_KEY= KEY
