module.exports = (sequelize, DataTypes) => {
    const Question = sequelize.define(
        "Question",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            category: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            question_text: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
        },
        {
            tableName: "questions",
            timestamps: true,
        }
    );

    return Question;
};
