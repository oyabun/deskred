FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone and install Recon-ng
WORKDIR /opt
RUN git clone https://github.com/lanmaster53/recon-ng.git
WORKDIR /opt/recon-ng
RUN pip install --no-cache-dir -r REQUIREMENTS

# Create results and workspace directory
RUN mkdir -p /results /root/.recon-ng

# Create wrapper script that accepts commands as arguments
RUN echo '#!/bin/sh\n\
# Parse arguments:\n\
# -w workspace -c "commands"\n\
workspace="default"\n\
commands=""\n\
\n\
while [ "$#" -gt 0 ]; do\n\
  case "$1" in\n\
    -w) workspace="$2"; shift 2;;\n\
    -c) commands="$2"; shift 2;;\n\
    *) echo "Unknown argument: $1"; exit 1;;\n\
  esac\n\
done\n\
\n\
if [ -n "$commands" ]; then\n\
  # Create resource file with commands and append exit\n\
  echo "$commands" > /tmp/commands.rc\n\
  echo "exit" >> /tmp/commands.rc\n\
  exec python -u /opt/recon-ng/recon-ng -w "$workspace" -r /tmp/commands.rc\n\
else\n\
  exec python -u /opt/recon-ng/recon-ng -w "$workspace"\n\
fi' > /usr/local/bin/recon-ng-wrapper && chmod +x /usr/local/bin/recon-ng-wrapper

WORKDIR /opt/recon-ng

# Use wrapper as entrypoint
ENTRYPOINT ["/usr/local/bin/recon-ng-wrapper"]
