from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Define route handlers
    def handle_session(route):
        request = route.request
        if request.method == "POST":
            # Respond with a new session
            route.fulfill(
                status=200,
                content_type="application/json",
                body='{"id": 123, "dataset_id": 1, "numero_frase": 0, "status": "active"}'
            )

    # Apply routes
    # Adjust URL pattern to match the API base URL if it's different in the app
    # API_BASE_URL is https://34.204.18.104 in api.ts
    page.route("**/api/v1/sessions", handle_session)

    # Also mock login just in case, though we set token manually
    page.route("**/auth/jwt/login", lambda route: route.fulfill(status=200, body='{"access_token": "fake", "token_type": "bearer"}'))

    # Start by setting the token
    page.goto("http://localhost:3000")
    page.evaluate("localStorage.setItem('access_token', 'fake-token')")
    page.reload()

    # Wait for the dataset buttons to appear (meaning we are authenticated)
    try:
        page.wait_for_selector('text="Voz Geral 10 min"', timeout=10000)
        print("Logged in and datasets visible.")
    except:
        print("Login failed or buttons not found.")
        page.screenshot(path="verification_failure_login.png")
        browser.close()
        return

    # Click the dataset button
    print("Clicking dataset button...")
    page.click('text="Voz Geral 10 min"')

    # Wait for navigation to Recording Page
    try:
        page.wait_for_url("**/recording/11", timeout=10000)
        print("Navigated to Recording Page.")
    except:
        print("Navigation failed.")
        page.screenshot(path="verification_failure_nav.png")
        browser.close()
        return

    # Verify VoiceCheckScreen appears (since numero_frase is 0)
    try:
        page.wait_for_selector('text="Como está sua voz hoje?"', timeout=10000)
        print("VoiceCheckScreen visible.")
    except:
        print("VoiceCheckScreen not found.")
        page.screenshot(path="verification_failure_voicecheck.png")
        browser.close()
        return

    # Take success screenshot
    page.screenshot(path="verification_success.png")
    print("Verification complete.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
