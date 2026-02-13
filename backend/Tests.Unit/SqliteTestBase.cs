using Infrastructure.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Tests.Unit;

public abstract class SqliteTestBase : IDisposable
{
    private readonly SqliteConnection _connection;
    protected readonly VaultonDbContext Db;

    protected SqliteTestBase()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<VaultonDbContext>()
            .UseSqlite(_connection)
            .Options;

        Db = new VaultonDbContext(options);
        Db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        Db.Dispose();
        _connection.Close();
    }
}
