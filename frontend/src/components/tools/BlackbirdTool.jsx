import GenericTool from './GenericTool';

function BlackbirdTool() {
  return (
    <GenericTool
      toolName="Blackbird"
      endpoint="/api/blackbird/search"
      inputLabel="Username"
      inputPlaceholder="Enter username to search across 584+ websites with account info"
      buttonLabel="Search 584+ Sites"
      paramName="username"
    />
  );
}

export default BlackbirdTool;
