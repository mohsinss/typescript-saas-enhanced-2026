'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

const ProjectForm = ({ params }: PageProps) => {
  const { id } = use(params);
  const router = useRouter();
  const [formData, setFormData] = useState({
    projectName: '',
    budget: '',
    timeline: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isNewProject, setIsNewProject] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        // Use v1 API directly to avoid redirect
        const response = await fetch(`/api/v1/project/${id}`);
        if (response.ok) {
          const result = await response.json();
          setFormData(result.data || {});
          setIsNewProject(false);
        } else if (response.status === 404) {
          // 404 is expected for new projects - just treat as new
          setIsNewProject(true);
        } else if (response.status === 401) {
          // Not authenticated - redirect to sign in
          router.push('/api/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname));
          return;
        } else {
          // Server errors (500, etc.) - treat as new project
          // Error is already logged server-side, no need to log client-side
          setIsNewProject(true);
        }
      } catch (error) {
        // Network errors - treat as new project silently
        setIsNewProject(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const url = isNewProject ? '/api/project' : `/api/project/${id}`;
      const method = isNewProject ? 'POST' : 'PUT';
      const body = isNewProject ? { ...formData, _id: id } : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const responseData = await response.json();

      if (response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      // Error handled by UI
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">Project Name</label>
          <input
            type="text"
            id="projectName"
            name="projectName"
            value={formData.projectName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-gray-700">Budget</label>
          <input
            type="number"
            id="budget"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        <div>
          <label htmlFor="timeline" className="block text-sm font-medium text-gray-700">Timeline (in months)</label>
          <input
            type="number"
            id="timeline"
            name="timeline"
            value={formData.timeline}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Project Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          ></textarea>
        </div>
        <div>
          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            {isNewProject ? 'Save Project' : 'Update Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
