import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath('index.html')
        await page.goto(f'file://{file_path}')

        # --- Verification for "Find the Number" Stage ---
        print("Verifying 'Find the Number' stage...")

        # Select a participant to start the game
        await page.get_by_text("תמר").click()

        # Wait for the game area to be visible and populated
        # Give it a generous timeout to allow for image preloading
        await expect(page.locator("#game-area .number-image")).to_have_count(10, timeout=15000)

        # Give a moment for numbers to start animating
        await page.wait_for_timeout(1500)

        print("Taking screenshot of 'Find the Number' stage...")
        await page.screenshot(path="jules-scratch/verification/01_find_the_number.png")

        # --- Verification for "Draw the Number" Stage ---
        print("Verifying 'Draw the Number' stage by jumping directly to it...")

        # Directly call the function to start the drawing stage
        await page.evaluate("() => window.startDrawTheNumber()")

        await expect(page.locator("#draw-number-screen")).to_be_visible(timeout=5000)

        # Draw on the canvas
        canvas = page.locator("#drawing-canvas")
        box = await canvas.bounding_box()

        if not box or box['width'] == 0 or box['height'] == 0:
             raise Exception("Canvas has no size. The fix is not working.")

        await page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        await page.mouse.down()
        await page.mouse.move(box['x'] + box['width'] / 2 + 50, box['y'] + box['height'] / 2 + 50)
        await page.mouse.up()

        print("Taking screenshot of 'Draw the Number' stage...")
        await page.screenshot(path="jules-scratch/verification/02_draw_the_number.png")

        await browser.close()
        print("Verification script finished successfully.")

if __name__ == '__main__':
    asyncio.run(main())