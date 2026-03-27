server {
    listen 80;
    server_name _;

    root /home/sam/emr-app/web/dist;
    index index.html;


    location /api/ {
      proxy_pass http://localhost:3001;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection upgrade;
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }

    location / {
      try_files $uri $uri/ /index.html;
    }

    error_page 404 /index.html;
    location = /index.html {
        internal;
    }
}
~  