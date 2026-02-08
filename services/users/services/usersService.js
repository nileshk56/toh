const dynamo = require('../db/dynamo');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const TABLE = 'users';

// Create User
const createUser = async ({ firstname, lastname, email, password, gender, dob }) => {
    const hashedPwd = await bcrypt.hash(password, 10);
    const user = { uid: uuidv4(), firstname, lastname, email, password: hashedPwd, gender, dob };
    console.log('Creating user:', user);
    try {
        await dynamo.put({ TableName: TABLE, Item: user }).promise();
    } catch (err) {
        throw err;
    }
    return user;
};

// Get User by Email
const getUserByEmail = async (email) => {
    const result = await dynamo.query({
        TableName: TABLE,
        IndexName: 'emailIndex',             // use the GSI
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email }
    }).promise();

    return result.Items[0];                 // returns the first matching user
};


// Get User by ID
const getUserByUid = async (uid) => {
    const result = await dynamo.get({ TableName: TABLE, Key: { uid } }).promise();
    return result.Item;
};

// Update User
const updateUser = async (id, data) => {
    const updates = Object.keys(data).map((k, i) => `${k} = :v${i}`).join(', ');
    const values = Object.values(data).reduce((acc, v, i) => ({ ...acc, [`:v${i}`]: v }), {});
    await dynamo.update({
        TableName: TABLE,
        Key: { id },
        UpdateExpression: `set ${updates}`,
        ExpressionAttributeValues: values
    }).promise();
    return await getUserById(id);
};

// Delete User
const deleteUser = async (id) => {
    await dynamo.delete({ TableName: TABLE, Key: { id } }).promise();
    return { id };
};

const searchUsersByName = async (firstName, lastNamePrefix) => {
    console.log(    'Searching users with firstName:', firstName, 'and lastNamePrefix:', lastNamePrefix);
    if (!firstName || !lastNamePrefix) {
        throw new Error("Both firstName and lastNamePrefix are required");
    }

    // normalize
    const fn = firstName.toLowerCase().trim();
    const ln = lastNamePrefix.toLowerCase().trim();

    const params = {
        TableName: TABLE,
        IndexName: 'firstname-lastname-index', // GSI with PK: firstName, SK: lastName
        KeyConditionExpression: 'firstname = :fn AND begins_with(lastname, :ln)',
        ExpressionAttributeValues: {
            ':fn': fn,
            ':ln': ln
        }
    };

    try {
        const result = await dynamo.query(params).promise(); // v2 syntax
        return result.Items || [];
    } catch (error) {
        console.error('DynamoDB query error:', error);
        throw error;
    }
};

module.exports = { createUser, getUserByEmail, getUserByUid, updateUser, deleteUser, searchUsersByName };
