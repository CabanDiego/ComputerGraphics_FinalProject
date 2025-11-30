import * as THREE from './modules/three.module.js';
import { setupLoadingScreen } from './LoadingScreen.js';
import { setupGameOverScreen } from './GameOverScreen.js';



let physicsWorld, scene, camera, renderer, clock, rigidBodies = [], tmpTrans;
const cameraPosition = new THREE.Vector3(0, 10, 20);

let keys = { left:false, right:false, up:false, down:false };
let isGameOver = false;

window.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowUp') keys.up = true;
    if (e.key === 'ArrowDown') keys.down = true;
});

window.addEventListener('keyup', (e)=>{
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowUp') keys.up = false;
    if (e.key === 'ArrowDown') keys.down = false;
});


const showStartScreen = setupLoadingScreen(() => {
    start(); 
});

const gameOverScreen = setupGameOverScreen(() => {
    gameOverScreen.hide();
    resetGame();
});


Ammo().then(() => {
    tmpTrans = new Ammo.btTransform();
    
    setTimeout(() => {
        showStartScreen(); 
    }, 1000);
});

function start() 
{
    setupPhysicsWorld();
    setupGraphics();
    createBlock();
    createBall();
    renderFrame();
}


function setupPhysicsWorld() 
{
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld = new Ammo.btDiscreteDynamicsWorld(
        dispatcher,
        overlappingPairCache,
        solver,
        collisionConfiguration
    );
    physicsWorld.setGravity(new Ammo.btVector3(0, -100, 0));
}

function setupGraphics() 
{
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    
    const skyboxCubemap = new THREE.CubeTextureLoader().load([
    'images/skybox/px.png', 
    'images/skybox/nx.png', 
    'images/skybox/py.png', 
    'images/skybox/ny.png', 
    'images/skybox/pz.png', 
    'images/skybox/nz.png'
    ])

    scene.background = skyboxCubemap;


    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.2,
        5000
    );
    camera.position.set(0, 30, 70);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1);
    hemiLight.color.setHSL(0.6, 0.6, 0.6);
    hemiLight.groundColor.setHSL(0.1, 1, 0.4);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    let dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(-1, 1.75, 1);
    dirLight.position.multiplyScalar(100);
    scene.add(dirLight);

    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    let d = 50;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 13500;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    renderer.shadowMap.enabled = true;
}

function renderFrame() {
    let deltaTime = clock.getDelta();
    updateBlockTilt(deltaTime);
    updatePhysics(deltaTime);

    //Make camera follow the ball
    if (rigidBodies.length > 0) {
        const ball = rigidBodies[0]; 
        const ballPos = ball.position.clone();

        //Camera offset behind and above the ball
        const cameraOffset = new THREE.Vector3(0, 30, 50);

        //Camera position
        const desiredPos = ballPos.clone().add(cameraOffset);

        //Smoothly move camera n
        camera.position.lerp(desiredPos, 0.1); 

        //Look slightly ahead of the ball
        const lookAtPos = ballPos.clone().add(new THREE.Vector3(0, 5, 0));
        camera.lookAt(lookAtPos);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(renderFrame);
    checkBallOffMap();
}


function createBlock() {
    let pos = {x:0, y:0, z:0};
    let scale = {x:50, y:2, z:200};
    // start platform flat (no initial tilt)
    let quat = {x:0, y:0, z:0, w:1};
    let mass = 0;

    // Three.js mesh with correct geometry
    let blockPlane = new THREE.Mesh(
        new THREE.BoxGeometry(scale.x, scale.y, scale.z),
        new THREE.MeshPhongMaterial({color:0xa0afa4})
    );
    blockPlane.position.set(pos.x, pos.y, pos.z);
    // no initial tilt — start flat
    blockPlane.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;
    scene.add(blockPlane);

    // Ammo.js collision
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x*0.5, scale.y*0.5, scale.z*0.5));
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0,0,0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(body);

    body.setCollisionFlags(body.getCollisionFlags() | 2); 
    body.setActivationState(4); 

    //Reduce bounciness and increase friction so the ball doesn't gain energy
    //Use a higher friction and a low restitution (0 = no bounce)
    body.setFriction(1.0);
    body.setRestitution(0.05);


    window.blockMesh = blockPlane;
    window.blockBody = body;
}


function createBall()
{
    let pos = {x: 0, y: 20, z: 0};
    let radius = 2;
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 2.0;

    const loader = new THREE.TextureLoader();
    const ballTexture = loader.load('images/ballTexture.jpg');

    //threeJS Section
    let ball = new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshPhongMaterial({ map: ballTexture }));

    ball.position.set(pos.x, pos.y, pos.z);
    
    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btSphereShape( radius );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );

    physicsWorld.addRigidBody( body );
    
    ball.userData.physicsBody = body;
    rigidBodies.push(ball);

    //Reduce bounciness and increase friction
    body.setRestitution(0.1);   
    body.setFriction(0.8);   
    body.setDamping(0.3, 0.3); 
    
}


function updatePhysics( deltaTime )
{
    physicsWorld.stepSimulation( deltaTime, 10 );

    for ( let i = 0; i < rigidBodies.length; i++ ) 
    {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) 
        {
            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
        }
    }
}


function updateBlockTilt(dt) {
    if (!window.blockMesh || !window.blockBody) return;

    // TUNING PARAMETERS (change as desired)
    const tiltSpeed = 3.00;   // responsiveness when a key is held (per second)
    const returnSpeed = 3.5; // speed when returning to center (per second)
    const maxTilt = Math.PI / 8; 

    // Determine target angles (radians). Start at 0 (flat).
    // ArrowUp should tilt platform away => negative X rotation
    let targetX = 0;
    let targetZ = 0;

    if (keys.up)    targetX -= maxTilt; // away = negative X
    if (keys.down)  targetX += maxTilt; // toward you = positive X
    if (keys.left)  targetZ += maxTilt; // keep same sign/behavior as your original code
    if (keys.right) targetZ -= maxTilt;

    // Per-axis speed: use tiltSpeed when commanding, returnSpeed when going back to 0
    let speedX = (keys.up || keys.down) ? tiltSpeed : returnSpeed;
    let speedZ = (keys.left || keys.right) ? tiltSpeed : returnSpeed;

    // Lerp the current rotation toward the target rotation using a proportion based on dt*speed.
    // Use Math.min(1, speed * dt) to keep the interpolation stable.
    let tX = Math.min(1, speedX * dt);
    let tZ = Math.min(1, speedZ * dt);

    // Use THREE's helpers for safe lerp & clamp
    blockMesh.rotation.x = THREE.MathUtils.lerp(blockMesh.rotation.x, targetX, tX);
    blockMesh.rotation.z = THREE.MathUtils.lerp(blockMesh.rotation.z, targetZ, tZ);

    // Clamp to max tilt
    blockMesh.rotation.x = THREE.MathUtils.clamp(blockMesh.rotation.x, -maxTilt, maxTilt);
    blockMesh.rotation.z = THREE.MathUtils.clamp(blockMesh.rotation.z, -maxTilt, maxTilt);

    // Update Ammo physics transform using the mesh quaternion
    // Ensure Ammo body is awake/active so it responds
    try {
        window.blockBody.activate();
    } catch (err) {
        // Some Ammo builds might not throw; ignore if not available
    }

    let transform = new Ammo.btTransform();
    transform.setIdentity();

    transform.setOrigin(new Ammo.btVector3(
        blockMesh.position.x,
        blockMesh.position.y,
        blockMesh.position.z
    ));

    // Convert Three.js quaternion → Ammo quaternion
    let q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(blockMesh.rotation.x, blockMesh.rotation.y, blockMesh.rotation.z, 'XYZ'));
    transform.setRotation(new Ammo.btQuaternion(q.x, q.y, q.z, q.w));

    blockBody.getMotionState().setWorldTransform(transform);
}

function checkBallOffMap() {
    if (rigidBodies.length === 0 || isGameOver) 
        return;

    const ball = rigidBodies[0];
    //Threshold for ball
    if (ball.position.y < -50) 
    { 
        isGameOver = true;
        gameOverScreen.show();
        stopBallPhysics(ball);
    }
}

//Freeze ball when it is out of bounds
function stopBallPhysics(ball) 
{
    const body = ball.userData.physicsBody;
    body.setActivationState(4); 
    body.setLinearVelocity(new Ammo.btVector3(0,0,0));
    body.setAngularVelocity(new Ammo.btVector3(0,0,0));
}

function resetGame() {
    isGameOver = false;
    //Remove old ball
    if (rigidBodies.length > 0) 
    {
        const oldBall = rigidBodies.pop();
        scene.remove(oldBall);
        physicsWorld.removeRigidBody(oldBall.userData.physicsBody);
    }
    
    //Reset block position
    if (window.blockMesh) 
    {
        window.blockMesh.rotation.set(0,0,0);
    }

    //Create a new ball
    createBall();
}

