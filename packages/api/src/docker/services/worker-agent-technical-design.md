## exec-per-job worker
```json
{
  "job_class": "image.resize.v1",
  "worker_command": ["/app/resize-worker"],
  "interface": {
    "kind": "exec_per_job"
  }
}
```

## persistent-http worker
```json
{
  "job_class": "image.resize.v1",
  "worker_command": ["/app/resize-worker"],
  "interface": {
    "kind": "persistent_http",
    "listener": {
      "type": "tcp",
      "port": 9000
    }
  }
}
```

