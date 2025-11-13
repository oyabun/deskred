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

# Create wrapper script that accepts commands via stdin
RUN echo '#!/bin/sh\n\
# If stdin is not a terminal, read commands from stdin and create resource file\n\
if [ ! -t 0 ]; then\n\
  cat > /tmp/commands.rc\n\
  exec python /opt/recon-ng/recon-ng "$@" -r /tmp/commands.rc\n\
else\n\
  exec python /opt/recon-ng/recon-ng "$@"\n\
fi' > /usr/local/bin/recon-ng-wrapper && chmod +x /usr/local/bin/recon-ng-wrapper

WORKDIR /opt/recon-ng

ENTRYPOINT ["recon-ng-wrapper"]
