import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

/** Filter options for querying games by related category and publisher IDs. */
export type GameFilters = {
    /** Match games with any of these category IDs. */
    categoryIds?: number[];
    /** Match games with any of these publisher IDs. */
    publisherIds?: number[];
};

/**
 * Builds an `IN` clause for a filter column when values are provided.
 *
 * @param values - IDs to match, or `undefined` when this filter is inactive.
 * @param column - The category or publisher foreign-key column.
 * @returns The SQL predicate, or `undefined` when there are no IDs.
 */
function buildIdFilterClause(
    values: number[] | undefined,
    column: typeof games.categoryId | typeof games.publisherId,
): SQL<unknown> | undefined {
    if (!values || values.length === 0) {
        return undefined;
    }

    return inArray(column, values);
}

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * Gets all categories in alphabetical order for the game filter controls.
 *
 * @param db - The database connection to query.
 * @returns Category IDs and names ordered by name.
 */
export async function getAllCategories(
    db: Database,
): Promise<Array<{ id: number; name: string }>> {
    return db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
}

/**
 * Gets all publishers in alphabetical order for the game filter controls.
 *
 * @param db - The database connection to query.
 * @returns Publisher IDs and names ordered by name.
 */
export async function getAllPublishers(
    db: Database,
): Promise<Array<{ id: number; name: string }>> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}

/**
 * Gets games matching optional category and publisher filters, ordered by title.
 *
 * @param db - The database connection to query.
 * @param filters - Optional category and publisher IDs. Multiple IDs within a
 * filter are combined with OR; category and publisher filters are combined with AND.
 * @returns Matching games with their category and publisher details.
 */
export async function getGamesByFilters(
    db: Database,
    filters: GameFilters = {},
): Promise<Game[]> {
    const clauses: SQL<unknown>[] = [];
    const categoryClause = buildIdFilterClause(filters.categoryIds, games.categoryId);
    const publisherClause = buildIdFilterClause(filters.publisherIds, games.publisherId);

    if (categoryClause) {
        clauses.push(categoryClause);
    }

    if (publisherClause) {
        clauses.push(publisherClause);
    }

    const query =
        clauses.length > 0
            ? baseGamesQuery(db).where(and(...clauses))
            : baseGamesQuery(db);
    const rows = await query.orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Gets all games ordered by title, optionally filtered by category and/or publisher.
 *
 * @param db - The database connection to query.
 * @param filters - Optional category and publisher IDs to match.
 * @returns Matching games with their category and publisher details.
 */
export async function getAllGames(
    db: Database,
    filters: GameFilters = {},
): Promise<Game[]> {
    return getGamesByFilters(db, filters);
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
