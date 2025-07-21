import { Loader } from "@react-three/drei";
import { Lipsync } from "wawa-lipsync";
import { UI } from "./components/UI";
import { lipsyncTTSService } from "./services/lipsyncTTSService";
import { Routes, Route } from "react-router-dom";
import Login from "./components/Login";

export const lipsyncManager = new Lipsync({});

// Add listening state to lipsyncManager
lipsyncManager.isListening = false;

// Make lipsyncTTSService globally available for speech recognition service
window.lipsyncTTSService = lipsyncTTSService;


function App() {

  return (
    <>
      <Loader />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<UI />} />
        <Route path="/mock-interview" element={<UI />} />
        <Route path="/learn-languages" element={<UI />} />
      </Routes>
    </>
  );
}

export default App;
