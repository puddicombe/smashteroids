FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m nodejs

# Change ownership (optional for volume mounts)
RUN chown -R nodejs:nodejs /usr/src/app

# Switch to the non-root user
USER nodejs

# Expose the port your app listens on
EXPOSE 3030

# Start the app
CMD ["npm", "start"]
