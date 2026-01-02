# Prompt: Generate Elegant Custom Notifications Without Using ShadCN

## Objective

Create elegant and user-friendly custom notifications that enhance the user experience on the web application. The notifications should be built from scratch without using ShadCN or any specific third-party library, ensuring flexibility and customization. They should have visually appealing colors and be strategically positioned on the screen based on the context in which they appear.

## Requirements

### 1. Notification Design
- **Framework**: Build custom notification components from scratch to ensure flexibility in design and functionality.
- **Aesthetics**: Notifications should have a modern and sleek design with smooth animations and transitions.
- **Color Scheme**:
  - Use colors that align with the application's theme.
  - Ensure contrast and readability, especially for important messages (e.g., errors, warnings).
  - Examples:
    - **Success**: Green with a subtle gradient or shadow effect.
    - **Error**: Red with a slight darkening effect for emphasis.
    - **Warning**: Amber or yellow with moderate brightness.
    - **Info**: Blue with a soft glow to catch the user’s attention.

### 2. Strategic Positioning
- **Context-Based Placement**:
  - **Top Right Corner**: For general notifications (e.g., informational messages, success confirmations).
  - **Center of Screen**: For critical alerts or errors that require immediate user attention.
  - **Bottom Left Corner**: For subtle notifications (e.g., non-intrusive updates or background processes).
- **Responsive Positioning**:
  - Ensure notifications adapt to different screen sizes and orientations.
  - Use CSS media queries to adjust positioning for mobile and desktop views.

### 3. Contextual Usage
- **User Actions**:
  - Trigger notifications based on specific user actions (e.g., form submission, deletion confirmation, etc.).
  - **Success**: Display when an action is completed successfully (e.g., “Your profile has been updated successfully!”).
  - **Error**: Show when an error occurs, providing clear messaging on what went wrong (e.g., “Failed to save changes. Please try again.”).
  - **Warning**: Warn users about potential issues or confirm destructive actions (e.g., “Are you sure you want to delete this item?”).
- **System Events**:
  - Notify users about system events such as timeouts, session expirations, or maintenance schedules.
  - **Info**: Provide information on upcoming events or changes (e.g., “Scheduled maintenance will begin at midnight.”).

### 4. Interactive Elements
- **Close Button**: Each notification should have a close (X) button for manual dismissal.
- **Auto-Dismissal**: Set a default auto-dismissal timer for notifications (e.g., 5 seconds), with the option to customize based on notification type.
- **Clickable Actions**: For some notifications, include actionable elements (e.g., “Undo” button for an accidental delete).

### 5. Accessibility Considerations
- **ARIA Labels**: Ensure all notifications are accessible, with appropriate ARIA labels and roles.
- **Focus Management**: For important notifications, manage focus to ensure screen readers announce them correctly.

## Implementation Details

### Custom Components
- Build notification components using plain HTML, CSS, and JavaScript (or the chosen front-end framework, e.g., React, Angular, Vue).
- Create reusable notification components with props or inputs for different types of messages (success, error, warning, info).
- Utilize CSS for styling and animations, ensuring smooth transitions and visually appealing effects.

### Notification Logic
- Implement notification logic to handle various scenarios and ensure that notifications are contextually appropriate and non-intrusive.
- Use React hooks or state management (like Redux or Context API in React, or similar tools in other frameworks) to manage the notification state globally across the application.
- Ensure that notifications are stackable, meaning multiple notifications can appear at once without overlapping or causing layout issues.

### Example Code Snippets
Provide example code snippets to illustrate how to create custom notifications:

```jsx
// Example using React
import React, { useState } from 'react';

// Custom Notification Component
function Notification({ type, message, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: type === 'error' ? '50%' : '20px',
        right: '20px',
        backgroundColor: type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        transition: 'all 0.3s ease-in-out',
        opacity: 1,
        transform: 'translateY(0)',
      }}
    >
      {message}
      <button onClick={onClose} style={{ marginLeft: '10px', color: '#fff', cursor: 'pointer' }}>X</button>
    </div>
  );
}

// Usage Example in a React Component
function App() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (type, message) => {
    setNotifications([...notifications, { type, message }]);
    setTimeout(() => removeNotification(message), 5000); // Auto-dismiss after 5 seconds
  };

  const removeNotification = (message) => {
    setNotifications(notifications.filter(n => n.message !== message));
  };

  return (
    <div>
      <button onClick={() => addNotification('success', 'Your changes have been saved successfully!')}>
        Show Success Notification
      </button>
      {notifications.map((n, index) => (
        <Notification key={index} type={n.type} message={n.message} onClose={() => removeNotification(n.message)} />
      ))}
    </div>
  );
}

export default App;
