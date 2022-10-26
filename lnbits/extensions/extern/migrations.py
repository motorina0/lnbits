async def m002_initial(db):
    await db.execute(
        f"""
       CREATE TABLE extern.extensions (
           id TEXT PRIMARY KEY,
           "user" TEXT NOT NULL,
           name TEXT NOT NULL,
           public_id TEXT NOT NULL,
           active BOOLEAN NOT NULL DEFAULT false,
           manifest TEXT DEFAULT '{{}}',
           time TIMESTAMP NOT NULL DEFAULT {db.timestamp_now}
       );
        """
    )
