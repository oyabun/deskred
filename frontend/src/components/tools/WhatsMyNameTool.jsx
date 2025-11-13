import GenericTool from './GenericTool';

function WhatsMyNameTool() {
  return (
    <GenericTool
      toolName="WhatsMyName"
      endpoint="/api/whatsmyname/search"
      inputLabel="Username"
      inputPlaceholder="Enter username to search across 600+ websites"
      buttonLabel="Search 600+ Sites"
      paramName="username"
    />
  );
}

export default WhatsMyNameTool;
