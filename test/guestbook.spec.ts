import { test, expect } from '@playwright/test';

test.describe('Guestbook Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#guest-messages');
    await page.waitForLoadState('networkidle');
  });

  test('loads correctly and displays form', async ({ page }) => {
    const form = page.getByTestId('guest-form');
    await expect(form).toBeVisible();

    const nameInput = page.getByTestId('guest-name');
    const messageTextarea = page.getByTestId('guest-message');
    const submitButton = page.getByTestId('guest-submit');

    await expect(nameInput).toBeVisible();
    await expect(messageTextarea).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('submits form and displays message', async ({ page }) => {
    const nameInput = page.getByTestId('guest-name');
    const messageTextarea = page.getByTestId('guest-message');
    const submitButton = page.getByTestId('guest-submit');

    const testName = 'Test User';
    const testMessage = 'This is a test message for the guestbook.';

    await nameInput.fill(testName);
    await messageTextarea.fill(testMessage);
    await submitButton.click();

    // Wait for submission to complete
    // Wait for form submission to complete\n    await expect(page.locator("[data-testid=""guest-messages""]")).toHaveAttribute("data-updating", "false", { timeout: 5000 });

    // Check if message appears in the list
    const messageList = page.getByTestId('guest-messages');
    await expect(messageList).toContainText(testName);
    await expect(messageList).toContainText(testMessage);
  });

  test('handles empty form submission', async ({ page }) => {
    const submitButton = page.getByTestId('guest-submit');
    await submitButton.click();

    // Should show validation errors or prevent submission
    const errorMessage = page.locator('.error-message, [role="alert"]');
    await expect(
      errorMessage.or(page.locator('input:invalid')).or(page.locator('textarea:invalid')),
    ).toBeVisible();
  });

  test('handles long message input', async ({ page }) => {
    const nameInput = page.getByTestId('guest-name');
    const messageTextarea = page.getByTestId('guest-message');
    const submitButton = page.getByTestId('guest-submit');

    const longMessage = 'A'.repeat(1000); // Very long message

    await nameInput.fill('Long Message User');
    await messageTextarea.fill(longMessage);
    await submitButton.click();

    // Wait for form submission to complete\n    await expect(page.locator("[data-testid=""guest-messages""]")).toHaveAttribute("data-updating", "false", { timeout: 5000 });

    const messageList = page.getByTestId('guest-messages');
    await expect(messageList).toContainText('Long Message User');
    await expect(messageList).toContainText(longMessage.substring(0, 100)); // Check first part
  });

  test('handles special characters in message', async ({ page }) => {
    const nameInput = page.getByTestId('guest-name');
    const messageTextarea = page.getByTestId('guest-message');
    const submitButton = page.getByTestId('guest-submit');

    const specialMessage = 'Message with émojis 🎉 and symbols @#$%^&*()';

    await nameInput.fill('Special User');
    await messageTextarea.fill(specialMessage);
    await submitButton.click();

    // Wait for form submission to complete\n    await expect(page.locator("[data-testid=""guest-messages""]")).toHaveAttribute("data-updating", "false", { timeout: 5000 });

    const messageList = page.getByTestId('guest-messages');
    await expect(messageList).toContainText('Special User');
    await expect(messageList).toContainText(specialMessage);
  });

  test.describe('mobile responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('form is usable on mobile', async ({ page }) => {
      const form = page.getByTestId('guest-form');
      await expect(form).toBeVisible();

      const nameInput = page.getByTestId('guest-name');
      const messageTextarea = page.getByTestId('guest-message');

      await nameInput.fill('Mobile User');
      await messageTextarea.fill('Testing on mobile device');

      // Check that inputs are properly sized for mobile
      const nameBox = await nameInput.boundingBox();
      const messageBox = await messageTextarea.boundingBox();

      expect(nameBox?.width).toBeGreaterThan(300); // Should be wide enough
      expect(messageBox?.width).toBeGreaterThan(300);
    });
  });

  test.describe('tablet responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('form displays correctly on tablet', async ({ page }) => {
      const form = page.getByTestId('guest-form');
      await expect(form).toBeVisible();

      // Test submission on tablet
      const nameInput = page.getByTestId('guest-name');
      const messageTextarea = page.getByTestId('guest-message');
      const submitButton = page.getByTestId('guest-submit');

      await nameInput.fill('Tablet User');
      await messageTextarea.fill('Testing on tablet');
      await submitButton.click();

      // Wait for form submission to complete\n    await expect(page.locator("[data-testid=""guest-messages""]")).toHaveAttribute("data-updating", "false", { timeout: 5000 });

      const messageList = page.getByTestId('guest-messages');
      await expect(messageList).toContainText('Tablet User');
    });
  });

  test.describe('desktop responsiveness', () => {
    test.use({ viewport: { width: 1920, height: 1084 } });

    test('form displays correctly on desktop', async ({ page }) => {
      const form = page.getByTestId('guest-form');
      await expect(form).toBeVisible();

      // Test that layout doesn't break on large screens
      const container = page.locator('#guest-messages .card');
      const box = await container.boundingBox();
      expect(box?.width).toBeLessThan(1920); // Should not stretch full width
    });
  });
});
