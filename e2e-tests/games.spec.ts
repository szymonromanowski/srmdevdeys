import { test, expect, type Response } from '@playwright/test';

test.describe('Game Listing and Navigation', () => {
  test('should display games with titles on index page', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
    });

    await test.step('Verify games grid is visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify game cards are displayed', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first()).toBeVisible();
      expect(await gameCards.count()).toBeGreaterThan(0);
    });

    await test.step('Verify game cards have titles with content', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first().getByTestId('game-title')).toBeVisible();
      await expect(gameCards.first().getByTestId('game-title')).not.toBeEmpty();
    });
  });

  test('should filter games by category and publisher combination', async ({ page }) => {
    await test.step('Navigate to homepage and open filters', async () => {
      await page.goto('/');
      await expect(page.getByTestId('game-filters')).toBeVisible();
    });

    await test.step('Select a single category and publisher', async () => {
      await page.getByLabel('Filter games by category').selectOption({ label: 'Strategy' });
      await page.getByLabel('Filter games by publisher').selectOption({ label: 'CodeForge Studios' });
      await page.getByRole('button', { name: 'Apply filters' }).click();
    });

    await test.step('Verify the filtered result matches the chosen combination', async () => {
      await expect(page).toHaveURL(/\?.*category=.*publisher=.*/);
      await expect(page.getByRole('link', { name: /DevOps Dominion Strategy/ })).toHaveCount(1);
      await expect(page.getByText('1 game filtered')).toHaveText('1 game filtered');
    });
  });

  test('should show games matching multiple selected categories', async ({ page }) => {
    await test.step('Navigate to the homepage and select multiple categories', async () => {
      await page.goto('/');
      await page.getByLabel('Filter games by category').selectOption([
        { label: 'Strategy' },
        { label: 'Puzzle' },
      ]);
    });

    await test.step('Verify games from either selected category are included', async () => {
      await expect(page).toHaveURL(/\?category=\d+&category=\d+/);
      await expect(page.getByRole('link', { name: /DevOps Dominion Strategy/ })).toHaveCount(1);
      await expect(page.getByRole('link', { name: /Code Puzzle Chronicles Puzzle/ })).toHaveCount(1);
      await expect(page.getByText('8 games filtered')).toHaveText('8 games filtered');
    });
  });

  test('should filter games by publisher without a category filter', async ({ page }) => {
    await test.step('Select a publisher without selecting a category', async () => {
      await page.goto('/');
      await page.getByLabel('Filter games by publisher').selectOption({ label: 'CodeForge Studios' });
    });

    await test.step('Verify only games from that publisher are shown', async () => {
      await expect(page).toHaveURL(/\?publisher=\d+/);
      await expect(page.getByRole('link', { name: /DevOps Dominion Strategy/ })).toHaveCount(1);
      await expect(page.getByRole('link', { name: /Binary Frontier/ })).toHaveCount(0);
      await expect(page.getByText('6 games filtered')).toHaveText('6 games filtered');
    });
  });

  test('filter controls have accessible labels, test IDs, and keyboard focus states', async ({ page }) => {
    await page.goto('/');

    const categoryFilter = page.getByLabel('Filter games by category');
    const publisherFilter = page.getByLabel('Filter games by publisher');
    await expect(categoryFilter).toHaveCount(1);
    await expect(publisherFilter).toHaveCount(1);
    await expect(page.getByTestId('category-filter')).toHaveCount(1);
    await expect(page.getByTestId('publisher-filter')).toHaveCount(1);
    await expect(page.getByTestId('apply-filters-button')).toHaveCount(1);
    await expect(page.getByTestId('clear-filters-link')).toHaveCount(1);

    await test.step('Tab through the filter controls and verify visible focus styling', async () => {
      await categoryFilter.focus();
      await expect(categoryFilter).toBeFocused();
      const categoryFocusRing = await categoryFilter.evaluate((element) => {
        const styles = window.getComputedStyle(element);
        return styles.boxShadow !== 'none' || styles.outlineWidth !== '0px';
      });
      expect(categoryFocusRing).toBeTruthy();

      await page.keyboard.press('Tab');
      await expect(publisherFilter).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Apply filters' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Clear filters' })).toBeFocused();
    });
  });

  test('should navigate to correct game details page when clicking on a game', async ({ page }) => {
    let gameId: string | null;
    let gameTitle: string | null;

    await test.step('Navigate to homepage and wait for games to load', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Get first game information and click it', async () => {
      const firstGameCard = page.getByTestId('game-card').first();
      gameId = await firstGameCard.getAttribute('data-game-id');
      gameTitle = await firstGameCard.getAttribute('data-game-title');
      await firstGameCard.click();
    });

    await test.step('Verify navigation to game details page', async () => {
      await expect(page).toHaveURL(`/game/${gameId}`);
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title matches clicked game', async () => {
      if (gameTitle) {
        await expect(page.getByTestId('game-details-title')).toHaveText(gameTitle);
      }
    });
  });

  test('should display game details with all required information', async ({ page }) => {
    await test.step('Navigate to specific game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title is displayed', async () => {
      const gameTitle = page.getByTestId('game-details-title');
      await expect(gameTitle).toBeVisible();
      await expect(gameTitle).not.toBeEmpty();
    });

    await test.step('Verify game description is displayed', async () => {
      const gameDescription = page.getByTestId('game-details-description');
      await expect(gameDescription).toBeVisible();
      await expect(gameDescription).not.toBeEmpty();
    });

    await test.step('Verify publisher or category information is present', async () => {
      const publisherExists = await page.getByTestId('game-details-publisher').isVisible();
      const categoryExists = await page.getByTestId('game-details-category').isVisible();
      expect(publisherExists || categoryExists).toBeTruthy();

      if (publisherExists) {
        await expect(page.getByTestId('game-details-publisher')).not.toBeEmpty();
      }

      if (categoryExists) {
        await expect(page.getByTestId('game-details-category')).not.toBeEmpty();
      }
    });
  });

  test('should display a button to back the game', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify back game button is visible and enabled', async () => {
      const backButton = page.getByTestId('back-game-button');
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText('Support This Game');
      await expect(backButton).toBeEnabled();
    });
  });

  test('should be able to navigate back to home from game details', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Click back to all games link', async () => {
      const backLink = page.getByRole('link', { name: /back to all games/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
    });

    await test.step('Verify navigation back to homepage', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should return a 404 page for a non-existent game', async ({ page }) => {
    let response: Response | null;

    await test.step('Navigate to non-existent game', async () => {
      response = await page.goto('/game/99999');
    });

    await test.step('Verify a branded 404 page is served', async () => {
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/Page Not Found - Tailspin Toys/);
      await expect(page.getByTestId('not-found')).toBeVisible();
      await expect(page.getByTestId('not-found-heading')).not.toBeEmpty();
      await expect(page.getByTestId('not-found-home-link')).toBeVisible();
    });
  });
});
