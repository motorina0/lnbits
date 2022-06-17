async def m001_initial(db):
    """
    Initial wallet table.
    """
    await db.execute(
        """
        CREATE TABLE watchonly.wallets (
            id TEXT NOT NULL PRIMARY KEY,
            "user" TEXT,
            masterpub TEXT NOT NULL,
            title TEXT NOT NULL,
            address_no INTEGER NOT NULL DEFAULT 0,
            balance INTEGER NOT NULL
        );
    """
    )

    await db.execute(
        """
        CREATE TABLE watchonly.addresses (
            id TEXT NOT NULL PRIMARY KEY,
            address TEXT NOT NULL,
            wallet TEXT NOT NULL,
            amount INTEGER NOT NULL
        );
    """
    )

    await db.execute(
        """
        CREATE TABLE watchonly.mempool (
            "user" TEXT NOT NULL,
            endpoint TEXT NOT NULL 
        );
    """
    )

async def m002_xxx(db):
    """
    xxxx.
    """
    
    await db.execute("ALTER TABLE watchonly.addresses ADD COLUMN branch_index INTEGER NOT NULL DEFAULT 0;")
    await db.execute("ALTER TABLE watchonly.addresses ADD COLUMN address_index INTEGER NOT NULL DEFAULT 0;")
    await db.execute("ALTER TABLE watchonly.addresses ADD COLUMN note TEXT;")
