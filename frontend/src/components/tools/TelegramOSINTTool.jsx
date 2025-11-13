import GenericTool from './GenericTool';

function TelegramOSINTTool() {
  return (
    <GenericTool
      toolName="Telegram OSINT"
      endpoint="/api/telegram-osint/search"
      inputLabel="Username"
      inputPlaceholder="Enter Telegram username or group"
      buttonLabel="Search Telegram"
      paramName="username"
    />
  );
}

export default TelegramOSINTTool;
