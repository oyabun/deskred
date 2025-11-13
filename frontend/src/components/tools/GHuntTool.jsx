import GenericTool from './GenericTool';

function GHuntTool() {
  return (
    <GenericTool
      toolName="GHunt"
      endpoint="/api/ghunt/search"
      inputLabel="Email Address"
      inputPlaceholder="Enter Gmail/Google email address"
      buttonLabel="Investigate Google Account"
      paramName="email"
    />
  );
}

export default GHuntTool;
