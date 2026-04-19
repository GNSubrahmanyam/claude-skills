# Docker API and Programmatic Access
**Impact:** LOW - Enables automation, integration, and custom tooling for Docker operations

**Problem:**
Manual Docker CLI commands don't scale for automation, monitoring, or integration with other systems. The Docker API provides programmatic access for building custom tools, CI/CD pipelines, and monitoring solutions.

**Solution:**
Leverage the Docker API for programmatic container management, automation, and integration with external systems.

## ✅ Correct: Docker API utilization

### 1. Docker API basics
```bash
# Check API version
curl --unix-socket /var/run/docker.sock \
  http://localhost/version

# List containers via API
curl --unix-socket /var/run/docker.sock \
  http://localhost/containers/json

# Get container logs
curl --unix-socket /var/run/docker.sock \
  http://localhost/containers/myapp/logs?stdout=1&stderr=1
```

### 2. API authentication and security
```bash
# Enable TLS for API
# /etc/docker/daemon.json
{
  "tls": true,
  "tlscert": "/path/to/server-cert.pem",
  "tlskey": "/path/to/server-key.pem",
  "tlscacert": "/path/to/ca.pem"
}

# Connect with client certificates
curl --unix-socket /var/run/docker.sock \
  --cert /path/to/client-cert.pem \
  --key /path/to/client-key.pem \
  --cacert /path/to/ca.pem \
  https://docker-host:2376/containers/json
```

### 3. Container management via API
```python
import docker
import json

# Python Docker SDK
client = docker.from_env()

# List containers
containers = client.containers.list()
for container in containers:
    print(f"Container: {container.name}, Status: {container.status}")

# Create container
container = client.containers.run(
    "nginx:alpine",
    name="my-nginx",
    ports={'80/tcp': 8080},
    detach=True
)

# Get container logs
logs = container.logs()
print(logs.decode('utf-8'))

# Stop and remove
container.stop()
container.remove()
```

### 4. Image management
```python
# Build image
client = docker.from_env()

# Build from Dockerfile
image, logs = client.images.build(
    path=".",
    dockerfile="Dockerfile",
    tag="myapp:latest"
)

# Pull image
image = client.images.pull("nginx:alpine")

# Push image
client.images.push("myregistry.com/myapp", tag="latest")

# List images
images = client.images.list()
for img in images:
    print(f"Image: {img.tags}, Size: {img.attrs['Size']}")
```

### 5. Docker Compose API integration
```python
import docker
from docker import APIClient

# Low-level API client
api_client = APIClient()

# Compose-like functionality
def deploy_stack(compose_file):
    with open(compose_file) as f:
        compose_data = yaml.safe_load(f)
    
    services = compose_data.get('services', {})
    for service_name, service_config in services.items():
        image = service_config.get('image')
        ports = service_config.get('ports', [])
        
        # Create container
        container = api_client.create_container(
            image=image,
            name=service_name,
            ports=[p.split(':')[1] for p in ports if ':' in p]
        )
        
        # Start container
        api_client.start(container['Id'])

# Usage
deploy_stack('docker-compose.yml')
```

### 6. Monitoring and events
```python
import docker

client = docker.from_env()

# Stream Docker events
for event in client.events(decode=True):
    print(f"Event: {event['Type']} {event['Action']}")
    if event['Type'] == 'container':
        print(f"Container: {event['Actor']['Attributes']['name']}")

# Get real-time stats
container = client.containers.get('myapp')
stats = container.stats(stream=False)
print(json.dumps(stats, indent=2))
```

### 7. Custom tooling examples
```python
# Container health checker
def check_container_health(container_name):
    client = docker.from_env()
    try:
        container = client.containers.get(container_name)
        health = container.attrs['State']['Health']['Status']
        return health == 'healthy'
    except:
        return False

# Auto-scaling based on metrics
def autoscale_service(service_name, target_cpu=70):
    client = docker.from_env()
    
    # Get current replicas
    service = client.services.get(service_name)
    current_replicas = service.attrs['Spec']['Mode']['Replicated']['Replicas']
    
    # Check CPU usage (simplified)
    # In real implementation, get metrics from monitoring system
    
    if cpu_usage > target_cpu:
        new_replicas = current_replicas + 1
        service.scale(new_replicas)
        print(f"Scaled {service_name} to {new_replicas} replicas")
```

### 8. API with web frameworks
```python
from flask import Flask, jsonify
import docker

app = Flask(__name__)
client = docker.from_env()

@app.route('/containers')
def list_containers():
    containers = client.containers.list()
    return jsonify([{
        'id': c.short_id,
        'name': c.name,
        'status': c.status,
        'image': c.image.tags[0] if c.image.tags else 'unknown'
    } for c in containers])

@app.route('/containers/<container_id>/logs')
def get_logs(container_id):
    container = client.containers.get(container_id)
    logs = container.logs(tail=100)
    return logs.decode('utf-8')

@app.route('/containers/<container_id>/restart', methods=['POST'])
def restart_container(container_id):
    container = client.containers.get(container_id)
    container.restart()
    return jsonify({'status': 'restarted'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

### 9. SDKs for other languages
```javascript
// Node.js Docker SDK
const Docker = require('dockerode');
const docker = new Docker();

async function listContainers() {
    const containers = await docker.listContainers();
    containers.forEach(container => {
        console.log(`${container.Names[0]}: ${container.Status}`);
    });
}

async function createContainer() {
    const container = await docker.createContainer({
        Image: 'nginx:alpine',
        name: 'my-nginx',
        PortBindings: {
            '80/tcp': [{ HostPort: '8080' }]
        }
    });
    
    await container.start();
    return container;
}
```

## ❌ Incorrect: API usage antipatterns

```bash
# ❌ Direct curl commands in scripts
curl --unix-socket /var/run/docker.sock \
  -X POST http://localhost/containers/create \
  -d '{"image":"nginx"}'

# ❌ No error handling
container = client.containers.run("nginx")

# ❌ Hardcoded API calls
# Instead of using SDKs for better abstraction
```

## Key Benefits
- **Automation**: Programmatic container lifecycle management
- **Integration**: Connect Docker with monitoring, CI/CD, and custom tools
- **Monitoring**: Real-time events and metrics collection
- **Custom tooling**: Build domain-specific Docker management tools
- **Scalability**: Handle complex multi-container operations
- **Reliability**: Better error handling and retry logic</content>
<parameter name="filePath">skills/docker-skill/rules/advanced/advanced-api.md