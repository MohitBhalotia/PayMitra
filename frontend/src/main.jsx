import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// import { QueryClient, QueryClientProvider } from 'react-query';
import App from './App.jsx';
import './index.css';

// Create a client for React Query
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       refetchOnWindowFocus: false,
//       retry: 1,
//     },
//   },
// });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* <QueryClientProvider client={queryClient}> */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
    {/* </QueryClientProvider> */}
  </React.StrictMode>
); 