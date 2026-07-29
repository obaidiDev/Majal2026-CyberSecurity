# Majal Store — run it on your own laptop (fallback)

Use this only if the shared class server isn't reachable. You need **Docker**
installed. You do **not** need the internet — the image is self-contained.

## 1. Load the image (from the file your instructor gave you)

```bash
gunzip -c majal-lab-image.tar.gz | docker load
```

## 2. Run it

```bash
docker run -d --name majal-lab -p 8080:8080 majal-lab:latest
```

## 3. Open it

<http://localhost:8080>

## Reset your copy (clean slate)

```bash
docker restart majal-lab
```

## Stop it when you're done

```bash
docker rm -f majal-lab
```

Log in with the account your instructor gives you (e.g. `student01` / `majal01`).
Everything you do stays on your machine — break it all you like.
