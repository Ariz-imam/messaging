import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import '../styles/Chat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

const socket = io('http://localhost:3001');

const Chat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get('http://localhost:3001/get-messages');
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    socket.on('new-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('message-deleted', (id) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== id));
    });

    return () => {
      socket.off('new-message');
      socket.off('message-deleted');
    };
  }, []);

  const sendMessage = async () => {
    if (!message && !file && !audioBlob) return;

    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadResponse = await axios.post('http://localhost:3001/upload-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const fileMessage = {
          sender: user,
          content: uploadResponse.data.url,
          type: file.type.startsWith('image/') ? 'image' : 'file',
        };
        await axios.post('http://localhost:3001/send-message', fileMessage);
      }

      if (audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob);
        const uploadResponse = await axios.post('http://localhost:3001/upload-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const audioMessage = {
          sender: user,
          content: uploadResponse.data.url,
          type: 'audio',
        };
        await axios.post('http://localhost:3001/send-message', audioMessage);
        setAudioBlob(null);
        setAudioUrl(null);
      }

      if (message) {
        const textMessage = { sender: user, content: message, type: 'text' };
        await axios.post('http://localhost:3001/send-message', textMessage);
      }

      setMessage('');
      setFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const deleteMessage = async (id) => {
    try {
      const response = await axios.delete(`http://localhost:3001/delete-message/${id}`, { data: { sender: user } });
      if (response.status === 200) {
        setMessages((prev) => prev.filter((msg) => msg._id !== id));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };
        recorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/mpeg' });
          setAudioBlob(audioBlob);
          setAudioUrl(URL.createObjectURL(audioBlob));
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      });
    } else {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="chat-container">
      <h2>Welcome, {user}!</h2>
      <div className="chat-window">
        {messages.map((msg) => (
          <div key={msg._id} className="chat-message">
            <div className="message-header">
              <strong>{msg.sender}:</strong>
              <button className="delete-button" onClick={() => deleteMessage(msg._id)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
            <div className="message-content">
              {msg.type === 'text' && <p>{msg.content}</p>}
              {msg.type === 'image' && <img src={msg.content} alt="uploaded" className="chat-image" />}
              {msg.type === 'audio' &&(
    <>
      <p>🎤 Voice Message:</p>
      <audio controls src={msg.content}></audio>
    </>
  )}
            </div>
          </div>
        ))}
      </div>

      <div className="input-container">
        <input
          type="text"
          placeholder="Type your message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
        <button className="voice-button" onClick={toggleRecording}>
          {isRecording ? 'Stop' : 'Record'}
        </button>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />
        {audioUrl && <audio controls src={audioUrl}></audio>}
      </div>
    </div>
  );
};

export default Chat;
