'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ButtonAccount from "@/components/ButtonAccount";
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { FaTrash } from 'react-icons/fa';
// import { Button } from "@/components/ui/button"; // Not currently used
import Notification from '@/components/Notification';

type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

type NotificationItem = {
  id: string;
  type: NotificationType;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  duration?: number;
  customStyle?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
  };
};

type Project = {
  _id: string;
  projectName: string;
  budget: number;
  timeline: number;
  createdAt: string;
};

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/project');
      if (response.ok) {
        const result = await response.json();
        setProjects(result.data || []);
      }
    } catch (error) {
      // Error handled by UI
    }
  };

  const handleAddNew = () => {
    const newId = uuidv4();
    router.push(`/dashboard/project/${newId}`);
  };

  const addNotification = useCallback((
    type: NotificationType, 
    message: string, 
    onConfirm?: () => void, 
    onCancel?: () => void, 
    duration?: number,
    customStyle?: { backgroundColor?: string; textColor?: string; borderColor?: string; }
  ) => {
    const id = uuidv4();
    setNotifications(prev => [...prev, { id, type, message, onConfirm, onCancel, duration, customStyle }]);
    
    if (type === 'success' && duration) {
      setTimeout(() => removeNotification(id), duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    addNotification('confirm', 'Are you sure you want to delete this project?', 
      () => confirmDelete(id), 
      () => removeNotification(id),
      undefined,
      { backgroundColor: 'white', textColor: 'black', borderColor: 'black' }
    );
  }, [addNotification, removeNotification]);

  const confirmDelete = async (id: string) => {
    const response = await fetch(`/api/project/${id}`, { method: 'DELETE' });
    if (response.ok) {
      fetchProjects();
      addNotification('success', 'The project has been successfully deleted.', undefined, undefined, 2000);
    } else {
      addNotification('error', 'Failed to delete the project. Please try again.');
    }
  };

  const handleCardClick = (id: string) => {
    router.push(`/dashboard/project/${id}`);
  };

  return (
    <main className="min-h-screen p-8 pb-24">
      <section className="max-w-4xl mx-auto space-y-8">
        <ButtonAccount />
        <h1 className="text-3xl md:text-4xl font-extrabold">Private Page</h1>
        <div className="flex justify-center mb-8">
          <button 
            onClick={handleAddNew}
            className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700" 
            style={{ height: '150px', width: '300px' }}
          >
            + Add New Project
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project._id}
              className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 relative group cursor-pointer"
              onClick={() => handleCardClick(project._id)}
            >
              <h3 className="font-bold text-lg mb-2">{project.projectName}</h3>
              <p className="text-sm text-gray-600 mb-2">Budget: ${project.budget}</p>
              <p className="text-sm text-gray-600 mb-2">Timeline: {project.timeline} months</p>
              <p className="text-xs text-gray-400">Created: {new Date(project.createdAt).toLocaleString()}</p>
              <button
                onClick={(e) => handleDelete(e, project._id)}
                className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      </section>
      {notifications.map((n) => (
        <Notification
          key={n.id}
          type={n.type}
          message={n.message}
          onClose={() => removeNotification(n.id)}
          onConfirm={n.onConfirm}
          onCancel={n.onCancel}
          position="top-center"
          duration={n.duration}
          customStyle={n.customStyle}
        />
      ))}
    </main>
  );
}