import React, { useState } from 'react';
import axios from "axios";
import './App.css';

const { fal } = require("@fal-ai/client");

const FAL_KEY= "946cb8b7-5b35-433f-89ac-53d49f9b0c84:2d19cba2c3d08529cc2c9599658390b3"

fal.config({
    credentials: FAL_KEY, // Replace with your key
  });

function App() {
  const [prompt, setPrompt] = useState(''); // Store text from the textbox
  const [vid, setVid] = useState(null); // Store selected MP4 file
  const [videoUrl, setVideoUrl] = useState(null); // Store the video URL after upload (if any)
  const [previewUrl, setPreviewUrl] = useState(null);

  const [videos, setVideos] = useState([]); // array of video objects: { file, previewUrl, caption }
  const [selectedVideo, setSelectedVideo] = useState(null); // currently selected video

  const  generateVideo = async () => {

    const formData = new FormData();
    formData.append('prompt', prompt);

    try {

    const { request_id } = await fal.queue.submit("fal-ai/wan-t2v", {
        input: {
          prompt: prompt, // from user input
        },
      });

      console.log(request_id)

      let videoUrl = null;
      while (true) {
        const status = await fal.queue.status("fal-ai/wan-t2v", {
          requestId: request_id,
          logs: true,
        });

        console.log(status)
  
        if (status.status == 'COMPLETED') {
          break;
        } else if (status.status == "FAILED") {
          alert("Video generation failed.");
          return;
        }
  
        // Wait a bit before checking again
        await new Promise((r) => setTimeout(r, 10000));
      }
      const result = await fal.queue.result("fal-ai/wan-t2v", {
        requestId: request_id,
        logs: true,
      });
  
      videoUrl = result?.data?.video?.url;
      if (!videoUrl) throw new Error("No video URL in result");

      const videoRes = await fetch(videoUrl);
        const blob = await videoRes.blob();
        const file = new File([blob], 'generated-video.mp4', { type: 'video/mp4' });
        const url = URL.createObjectURL(file)

        setPreviewUrl(url);
        setVid(file);

        setVideos(prev => [
          ...prev,
          {
            file,
            caption: prompt,
            previewUrl: url, // 👈 Add this!
          },
        ]);
        setPrompt(""); 
        alert("Video downloaded!");
    } catch (err) {
        console.error("Error generating video:", err);
        alert("Something went wrong.");
    }

  }

  const getPlatformIcon = (platform) => {
    const map = {
      youtube: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png",
      instagram: "https://cdn-icons-png.flaticon.com/512/1384/1384063.png",
      reddit: "https://cdn-icons-png.flaticon.com/512/2111/2111589.png",
      tiktok: "https://cdn-icons-png.flaticon.com/512/3046/3046122.png",
      linkedin: "https://cdn-icons-png.flaticon.com/512/1384/1384062.png",
    };
    return map[platform];
  };

  // Handle video upload to server
  const handleUpload = (platform, video) => {
    // if (!vid) {
    //   alert('No video generated!');
    //   return;
    // }

    platform = platform.toLowerCase()
    const formData = new FormData();
    formData.append('video', video.file);
    formData.append('caption', video.caption);

    axios.post(`http://localhost:5050/upload-${platform}`, formData)
    .then(response => {
        console.log(response.data)
    })

  };

  return (
    <div className="app-container">
      <h2>AI Video Publisher</h2>

      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt..."
        className="prompt-input"
      />

      <button className="generate-button" onClick={generateVideo}>
        🎬 Generate Video
      </button>

<div className="video-gallery">
  {videos.map((video, index) => (
    <div
          key={index}
          className="video-thumbnail"
          onClick={() => setSelectedVideo(video)}
          style={{ cursor: 'pointer' }}
        >
          <video
            src={video.previewUrl}
            width="200"
            style={{ borderRadius: '8px', margin: '10px' }}
          />
        </div>
  ))
  }
</div>

{selectedVideo && (
  <div className="selected-video-container">
    <h3>{selectedVideo.caption}</h3>
    <video
      src={selectedVideo.previewUrl}
      controls
      width="500"
      style={{ borderRadius: '8px' }}
    />
    <p style={{ marginTop: '10px' }}></p>

    <div className="button-group">
      {['youtube', 'instagram', 'reddit', 'tiktok', 'linkedin'].map((platform) => (
        <button
          className="icon-button"
          key={platform}
          onClick={() => handleUpload(platform, selectedVideo)}
        >
          <img
            src={getPlatformIcon(platform)}
            alt={platform}
            style={{ width: '32px', height: '32px' }}
          />
        </button>
      ))}
    </div>
  </div>
)}
    </div>
  );
}

export default App;