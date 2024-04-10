import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { describeOnCondition } from '../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';

const hasFutureFlag = process.env.STRAPI_FEATURES_FUTURE_CONTENT_HISTORY === 'true';

describeOnCondition(hasFutureFlag)('History', () => {
  test.describe('Collection Type', () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin.tar');
      await page.goto('/admin');
      await login({ page });
    });

    test('A user should be able create, edit, or publish/unpublish an entry, navigate to the history page, and select versions to view from a list', async ({
      page,
    }) => {
      const CREATE_URL =
        /\/admin\/content-manager\/collection-types\/api::article.article\/create(\?.*)?/;
      const HISTORY_URL =
        /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+\/history(\?.*)?/;
      // Navigate to the content-manager - collection type - article
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('combobox', { name: 'Select a locale' }).click();
      await page.getByRole('option', { name: 'French (fr)' }).click();
      await page.getByRole('link', { name: /Create new entry/, exact: true }).click();
      await page.waitForURL(CREATE_URL);

      /**
       * Create
       */
      const titleInput = await page.getByRole('textbox', { name: 'title' });
      // Create a french version
      const frenchTitle = "N'importe quoi";
      await titleInput.fill(frenchTitle);
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL(HISTORY_URL);
      await expect(titleInput).toHaveValue(frenchTitle);

      // Go back to the CM to create a new english entry
      await page.goto('/admin');
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: /Create new entry/, exact: true }).click();
      await page.waitForURL(CREATE_URL);

      // Create an english version
      const englishTitle = 'Being from Kansas is a pity';
      await titleInput.fill(englishTitle);
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL(HISTORY_URL);
      const versionCards = await page.getByRole('listitem', { name: 'Version card' });
      await expect(versionCards).toHaveCount(1);
      // Assert the id was added after page load
      const idRegex = /id=\d+/;
      await expect(idRegex.test(page.url())).toBe(true);
      // Assert the most recent version is the current version
      const currentVersion = versionCards.nth(0);
      await expect(currentVersion.getByText('(current)')).toBeVisible();
      await expect(currentVersion.getByText('Draft')).toBeVisible();
      await expect(titleInput).toBeDisabled();
      await expect(titleInput).toHaveValue(englishTitle);
      // Assert only the english versions are available
      await expect(page.getByText(frenchTitle)).not.toBeVisible();

      // Go back to the entry
      await page.getByRole('link', { name: 'Back' }).click();

      /**
       * Update
       */
      await titleInput.fill('Being from Kansas City');
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL(HISTORY_URL);
      await expect(versionCards).toHaveCount(2);
      // Assert the most recent version is the current version
      await expect(titleInput).toHaveValue('Being from Kansas City');
      // Assert the previous version in the list is the expected version
      const previousVersion = versionCards.nth(1);
      previousVersion.click();
      await expect(titleInput).toHaveValue('Being from Kansas is a pity');
      await expect(previousVersion.getByText('(current)')).not.toBeVisible();

      // Go back to the entry
      await page.getByRole('link', { name: 'Back' }).click();

      /**
       * Publish
       */
      await page.getByRole('button', { name: 'Publish' }).click();
      // Go to the history page
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL(HISTORY_URL);
      // Publish also creates a new draft so we expect the count to increase by 2
      await expect(versionCards).toHaveCount(4);
      // Assert the current version is the most recent published version
      await expect(titleInput).toHaveValue('Being from Kansas City');
      // The current version is the most recent draft
      await expect(currentVersion.getByText('Draft')).toBeVisible();
      await expect(titleInput).toHaveValue('Being from Kansas City');
      // The second in the list is the published version
      await expect(previousVersion.getByText('Published')).toBeVisible();
      previousVersion.click();
      await expect(titleInput).toHaveValue('Being from Kansas City');

      // Go back to the entry
      await page.getByRole('link', { name: 'Back' }).click();

      /**
       * Modified
       */
      await titleInput.fill('Being from Kansas City, Missouri');
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL(HISTORY_URL);
      await expect(versionCards).toHaveCount(5);
      // Assert the current version is the modified version
      await expect(currentVersion.getByText('Modified')).toBeVisible();
      await expect(titleInput).toHaveValue('Being from Kansas City, Missouri');
    });

    test('Relations should be displayed in history versions', async ({ page }) => {
      const AUTHOR_CREATE_URL =
        /\/admin\/content-manager\/collection-types\/api::author.author\/create(\?.*)?/;
      const AUTHOR_EDIT_URL =
        /\/admin\/content-manager\/collection-types\/api::author.author\/[^/]+(\?.*)?/;
      const ARTICLE_CREATE_URL =
        /\/admin\/content-manager\/collection-types\/api::article.article\/create(\?.*)?/;
      const ARTICLE_EDIT_URL =
        /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+(\?.*)?/;
      const ARTICLE_HISTORY_URL =
        /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+\/history(\?.*)?/;

      // Create new author
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Author' }).click();
      await page.getByRole('link', { name: /Create new entry/, exact: true }).click();
      await page.waitForURL(AUTHOR_CREATE_URL);
      await page.getByRole('textbox', { name: 'name' }).fill('Will Kitman');
      await page.getByRole('button', { name: 'Save' }).click();

      // Create new article and add authors to it
      await page.getByRole('link', { name: 'Article' }).click();
      await page.getByRole('link', { name: 'Create new entry' }).click();
      await page.waitForURL(ARTICLE_CREATE_URL);
      await page.getByRole('textbox', { name: 'title' }).fill('Zava retires');
      await page.getByRole('combobox', { name: 'Authors' }).click();
      await page.getByText('Will Kitman').click();
      await page.getByRole('combobox', { name: 'Authors' }).click();
      await page.getByText('Coach Beard').click();
      await page.getByRole('button', { name: 'Save' }).click();

      // Delete one of the authors, leaving only Coach Beard
      await page.getByRole('link', { name: 'Will Kitman' }).click();
      await page.waitForURL(AUTHOR_EDIT_URL);
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /delete document/i }).click();
      await page.getByRole('button', { name: /confirm/i }).click();

      // Go to the the article's history page
      await page.getByRole('link', { name: 'Article' }).click();
      await page.getByRole('gridcell', { name: 'Zava retires' }).click();
      await page.waitForURL(ARTICLE_EDIT_URL);
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL(ARTICLE_HISTORY_URL);

      // Assert that the unknown relation alert is displayed
      await expect(page.getByRole('link', { name: 'Coach Beard' })).toBeVisible();
      await expect(page.getByText('Will Kitman')).not.toBeVisible();
      await expect(page.getByText(/missing relation/i)).toBeVisible();
    });
  });

  test.describe('Single Type', () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin.tar');
      await page.goto('/admin');
      await login({ page });
    });

    test('A user should be able create, edit, or publish/unpublish an entry, navigate to the history page, and select versions to view from a list', async ({
      page,
    }) => {
      const HISTORY_URL =
        /\/admin\/content-manager\/single-types\/api::homepage.homepage\/history(\?.*)?/;

      // Navigate to the content-manager - single type - homepage
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Homepage' }).click();
      await page.getByRole('combobox', { name: 'Locales' }).click();
      await page.getByRole('option', { name: 'French (fr)' }).click();

      /**
       * Create
       */
      const titleInput = await page.getByRole('textbox', { name: 'title' });
      // Create a french version
      const frenchTitle = 'Paris Saint-Germain';
      await titleInput.fill(frenchTitle);
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL(HISTORY_URL);
      await expect(titleInput).toHaveValue(frenchTitle);

      // Go back to the CM to create a new english entry
      await page.getByRole('link', { name: 'Back' }).click();
      await page.getByRole('combobox', { name: 'Locales' }).click();
      await page.getByRole('option', { name: 'English (en)' }).click();

      // Create an english version
      const englishTitle = 'AFC Richmond';
      await titleInput.fill(englishTitle);
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL(HISTORY_URL);
      const versionCards = await page.getByRole('listitem', { name: 'Version card' });
      await expect(versionCards).toHaveCount(1);
      // Assert the id was added after page load
      const idRegex = /id=\d+/;
      await expect(idRegex.test(page.url())).toBe(true);
      // Assert the most recent version is the current version
      const currentVersion = versionCards.nth(0);
      const previousVersion = versionCards.nth(1);
      await expect(currentVersion.getByText('(current)')).toBeVisible();
      await expect(currentVersion.getByText('Draft')).toBeVisible();
      await expect(titleInput).toBeDisabled();
      await expect(titleInput).toHaveValue(englishTitle);
      // Assert only the english versions are available
      await expect(page.getByText(frenchTitle)).not.toBeVisible();

      // Go back to the entry
      await page.getByRole('link', { name: 'Back' }).click();

      /**
       * Update
       */
      await page.getByRole('textbox', { name: 'title' }).fill('Welcome to AFC Richmond');
      await page.getByRole('button', { name: 'Save' }).click();
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL(HISTORY_URL);
      await expect(versionCards).toHaveCount(2);
      // Assert the most recent version is the current version
      await expect(titleInput).toHaveValue('Welcome to AFC Richmond');
      // Assert the previous version in the list is the expected version
      previousVersion.click();
      await expect(titleInput).toHaveValue('AFC Richmond');

      // Go back to the entry
      await page.getByRole('link', { name: 'Back' }).click();

      /**
       * Publish
       */
      await page.getByRole('button', { name: 'Publish' }).click();
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL('**/content-manager/single-types/api::homepage.homepage/history**');
      // Publish also creates a new draft so we expect the count to increase by 2
      await expect(versionCards).toHaveCount(4);
      // The current version is the most recent draft
      await expect(currentVersion.getByText('Draft')).toBeVisible();
      await expect(titleInput).toHaveValue('Welcome to AFC Richmond');
      // The second in the list is the published version
      previousVersion.click();
      await expect(previousVersion.getByText('Published')).toBeVisible();
      await expect(titleInput).toHaveValue('Welcome to AFC Richmond');

      // Go back to the entry
      await page.getByRole('link', { name: 'Back' }).click();

      /**
       * Modified
       */
      await titleInput.fill('Welcome to AFC Richmond!');
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /content history/i }).click();
      await page.waitForURL(HISTORY_URL);
      await expect(versionCards).toHaveCount(5);
      // Assert the current version is the most recent published version
      await expect(titleInput).toHaveValue('Welcome to AFC Richmond!');
      await expect(currentVersion.getByText('Modified')).toBeVisible();
    });
  });
});
