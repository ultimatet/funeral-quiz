'use strict';
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('QuizResult', {
    userId:  { type: DataTypes.INTEGER, allowNull: false },
    answers: { type: DataTypes.JSONB,  allowNull: false }, // e.g. { "Q1": 3, …, "Q25": 5 }
    scores:  { type: DataTypes.JSONB,  allowNull: false }  // e.g. { Practical:7.5, … }
  }, {
    tableName: 'quiz_results',
    timestamps: true
  });
};
