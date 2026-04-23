#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Map, String, Symbol, Vec, symbol_short,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────

const SCORES: Symbol = symbol_short!("SCORES");       // Map<Address, u64>
const ACTIONS: Symbol = symbol_short!("ACTIONS");     // Map<Address, Vec<String>>
const ENDORSERS: Symbol = symbol_short!("ENDORSERS"); // Map<Address, Vec<Address>>
const ADMIN: Symbol = symbol_short!("ADMIN");         // Address (contract deployer)

// ─── Action Point Values ──────────────────────────────────────────────────────
// Each action name maps to a fixed point reward.
// Adjust these to tune your reputation economy.

const POINTS_COMPLETE_TASK: u64 = 10;
const POINTS_SUBMIT_REVIEW: u64 = 5;
const POINTS_VOTE: u64 = 3;
const POINTS_ENDORSE: u64 = 8; // Points given to the ENDORSED user

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct ReputationContract;

#[contractimpl]
impl ReputationContract {

    // ── Initialize ──────────────────────────────────────────────────────────
    // Call once after deployment to set the admin address.
    pub fn initialize(env: Env, admin: Address) {
        // Prevent re-initialization
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
    }

    // ── Record Action ────────────────────────────────────────────────────────
    // A user calls this to record an action and earn reputation points.
    // Supported actions: "complete_task", "submit_review", "vote"
    pub fn record_action(env: Env, user: Address, action: String) -> u64 {
        // The caller must authorize this call (only the user can record their own action)
        user.require_auth();

        // Determine points for this action
        let points: u64 = Self::action_to_points(&action);
        if points == 0 {
            panic!("unknown action type");
        }

        // Update the user's score
        let new_score = Self::add_score(&env, &user, points);

        // Log the action in the user's history
        Self::log_action(&env, &user, action);

        new_score
    }

    // ── Endorse User ─────────────────────────────────────────────────────────
    // endorser calls this to vouch for target_user.
    // target_user gains POINTS_ENDORSE points.
    // An address can only endorse the same target once.
    pub fn endorse(env: Env, endorser: Address, target_user: Address) -> u64 {
        endorser.require_auth();

        // Prevent self-endorsement
        if endorser == target_user {
            panic!("cannot endorse yourself");
        }

        // Load existing endorsers for target_user
        let mut endorsers: Vec<Address> = env
            .storage()
            .persistent()
            .get(&(&ENDORSERS, &target_user))
            .unwrap_or(Vec::new(&env));

        // Prevent duplicate endorsement
        if endorsers.contains(&endorser) {
            panic!("already endorsed this user");
        }

        endorsers.push_back(endorser);
        env.storage()
            .persistent()
            .set(&(&ENDORSERS, &target_user), &endorsers);

        // Award points to the endorsed user
        Self::add_score(&env, &target_user, POINTS_ENDORSE)
    }

    // ── Get Score ────────────────────────────────────────────────────────────
    // Read any user's current reputation score. Public, no auth needed.
    pub fn get_score(env: Env, user: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&(&SCORES, &user))
            .unwrap_or(0)
    }

    // ── Get Action History ───────────────────────────────────────────────────
    // Returns a list of action strings performed by the user.
    pub fn get_actions(env: Env, user: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&(&ACTIONS, &user))
            .unwrap_or(Vec::new(&env))
    }

    // ── Get Endorser Count ───────────────────────────────────────────────────
    // Returns how many unique addresses have endorsed this user.
    pub fn get_endorser_count(env: Env, user: Address) -> u32 {
        let endorsers: Vec<Address> = env
            .storage()
            .persistent()
            .get(&(&ENDORSERS, &user))
            .unwrap_or(Vec::new(&env));
        endorsers.len()
    }

    // ── Admin: Manually Award Points ─────────────────────────────────────────
    // Only the admin can call this (for special rewards, partnerships, etc.)
    pub fn admin_award(env: Env, admin: Address, user: Address, points: u64) -> u64 {
        admin.require_auth();

        // Verify the caller is actually the stored admin
        let stored_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != stored_admin {
            panic!("not admin");
        }

        Self::add_score(&env, &user, points)
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    fn add_score(env: &Env, user: &Address, points: u64) -> u64 {
        let current: u64 = env
            .storage()
            .persistent()
            .get(&(&SCORES, user))
            .unwrap_or(0);
        let new_score = current + points;
        env.storage()
            .persistent()
            .set(&(&SCORES, user), &new_score);
        new_score
    }

    fn log_action(env: &Env, user: &Address, action: String) {
        let mut history: Vec<String> = env
            .storage()
            .persistent()
            .get(&(&ACTIONS, user))
            .unwrap_or(Vec::new(env));
        history.push_back(action);
        env.storage()
            .persistent()
            .set(&(&ACTIONS, user), &history);
    }

    fn action_to_points(action: &String) -> u64 {
        // Match action string to point value
        // Extend this list to add more action types
        let len = action.len() as usize;
        if len > 32 {
            return 0;
        }
        let mut action_str = [0u8; 32];
        action.copy_into_slice(&mut action_str[..len]);
        let slice = &action_str[..len];

        if slice == b"complete_task" {
            POINTS_COMPLETE_TASK
        } else if slice == b"submit_review" {
            POINTS_SUBMIT_REVIEW
        } else if slice == b"vote" {
            POINTS_VOTE
        } else {
            0
        }
    }
}
