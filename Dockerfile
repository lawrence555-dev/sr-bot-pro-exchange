# Use official Playwright image to ensure all browser dependencies are present
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend (Vite)
# Note: The build script in package.json installs playwright chromium locally, 
# but we already have it in the image. We can skip the local install step or let it run (it validates).
RUN npm run build

# Expose port (Zeabur defaults to 8080)
EXPOSE 8080
ENV PORT=8080

# Start server
CMD ["npm", "run", "start"]
