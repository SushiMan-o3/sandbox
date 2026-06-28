# TODO
- Try playing around with fuckaround-end

- (async/sync mixing): Not currently broken, but a future risk — if a blocking call ever gets added inside async def, it freezes the event loop for all concurrent requests, not just that one. Keep blocking work in plain def, only use async def for genuinely async calls.
- (SSRF risk): /url_to_markdown fetches any URL a user gives it. Without validation, someone could point it at internal-only addresses (cloud metadata endpoint, localhost, internal services) and use your server as a proxy to reach them. Fix: block private IPs/localhost/non-http(s) schemes before fetching.
- (file upload risk): /upload_file_to_markdown doesn't check file size or type before processing. A huge or malicious file could hang the server or exploit whatever converter you're using. Fix: validate content_type and size first.
#- (missing error handling): The two parse endpoints don't catch exceptions, so a failure in convert_to_markdown/scrape_to_markdown/convert_to_json leaks a raw traceback to the client. Fix: wrap them in try/except like you already did for recipe_to_db.