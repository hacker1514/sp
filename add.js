function addCommand(line) {
    const inputFile = document.getElementById('addDBInput');
    inputFile.value = "";

    inputFile.onchange = async function() {
        if (!this.files.length) return;

        const file = this.files[0];
        const reader = new FileReader();

        reader.onload = function() {
            try {
                const importedDb = new SQL.Database(new Uint8Array(reader.result));

                const createStatementsRes = importedDb.exec("SELECT sql FROM sqlite_master WHERE type='table';");
                if (createStatementsRes.length === 0) throw new Error("No tables found in imported DB");

                createStatementsRes[0].values.forEach(row => {
                    const createSQL = row[0];
                    try {
                        db.run(createSQL);
                    } catch(e) {
                    }
                });
                const tablesRes = importedDb.exec("SELECT name FROM sqlite_master WHERE type='table';");
                tablesRes[0].values.forEach(row => {
                    const tableName = row[0];

                    const dataRes = importedDb.exec(`SELECT * FROM ${tableName};`);
                    if (dataRes.length > 0) {
                        const columns = dataRes[0].columns;
                        const valuesList = dataRes[0].values;

                        valuesList.forEach(values => {
                            const vals = values.map(v =>
                                (typeof v === 'string') ? `'${v.replace(/'/g, "''")}'` : (v === null ? "NULL" : v)
                            ).join(", ");

                            const insertSQL = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${vals});`;
                            try {
                                db.run(insertSQL);
                            } catch (e) {
                            }
                        });
                    }
                });

                const out = document.createElement("div");
                out.textContent = "Imported .db file data and schema added successfully.";
                document.getElementById("terminal").appendChild(out);
                addPrompt();

            } catch (e) {
                const out = document.createElement("div");
                out.textContent = "Error importing database: " + e.message;
                document.getElementById("terminal").appendChild(out);
                addPrompt();
            }
        };

        reader.readAsArrayBuffer(file);
    };

    inputFile.click();
    line.querySelector("input").disabled = true;
}
