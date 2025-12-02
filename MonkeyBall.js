import * as THREE from './modules/three.module.js';
import { setupLoadingScreen } from './LoadingScreen.js';
import { setupGameOverScreen } from './GameOverScreen.js';



let physicsWorld, scene, camera, renderer, clock, rigidBodies = [], tmpTrans;
const cameraPosition = new THREE.Vector3(0, 10, 20);

let keys = { left:false, right:false, up:false, down:false };
let isGameOver = false;
let obstacles = [];
let finishLine;

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
    physicsWorld.setGravity(new Ammo.btVector3(0, -50, 0)); // Even stronger gravity for much faster rolling
}

function setupGraphics() 
{
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfd1e5);

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
        const cameraOffset = new THREE.Vector3(0, 20, 50);

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
    let scale = {x:50, y:2, z:500}; // extended mystical forest platform
    let quat = {x:0, y:0, z:0, w:1};
    let mass = 0;

    // Create dirt texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Brown dirt base
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add dirt texture noise
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 3;
        const shade = Math.floor(Math.random() * 50) + 70;
        ctx.fillStyle = `rgb(${shade}, ${shade - 20}, ${shade - 40})`;
        ctx.fillRect(x, y, size, size);
    }
    
    const dirtTexture = new THREE.CanvasTexture(canvas);
    dirtTexture.wrapS = THREE.RepeatWrapping;
    dirtTexture.wrapT = THREE.RepeatWrapping;
    dirtTexture.repeat.set(10, 100);

    // Three.js mesh with dirt texture
    let blockPlane = new THREE.Mesh(
        new THREE.BoxGeometry(scale.x, scale.y, scale.z),
        new THREE.MeshPhongMaterial({
            map: dirtTexture,
            color: 0x8b6f47
        })
    );
    blockPlane.position.set(pos.x, pos.y, pos.z);
    blockPlane.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;
    scene.add(blockPlane);

    // platform uses compound shape to include obstacles
    let compoundShape = new Ammo.btCompoundShape();
    
    // platform collision box
    let platformShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x*0.5, scale.y*0.5, scale.z*0.5));
    platformShape.setMargin(0.05);
    let platformTransform = new Ammo.btTransform();
    platformTransform.setIdentity();
    compoundShape.addChildShape(platformTransform, platformShape);
    
    // obstacles positioned along the platform - fantasy forest dirt trail theme
    const obstacles3D = [];
    
    // DENSE FANTASY FOREST with WINDING PATH
    // Background trees on the outer edges to create forest atmosphere
    for (let z = -20; z > -240; z -= 25) {
        // Left forest edge
        createTree(blockPlane, -23, 2, z);
        createTree(blockPlane, -24, 2, z - 10);
        createBush(blockPlane, -22, 2, z - 5);
        
        // Right forest edge
        createTree(blockPlane, 23, 2, z);
        createTree(blockPlane, 24, 2, z - 10);
        createBush(blockPlane, 22, 2, z - 5);
    }
    
    // CLEAR WINDING PATH - Heavy barriers force side-to-side movement
    // Path is like a snake - must swerve left and right to pass
    
    // START - Wide open entrance
    createTree(blockPlane, -18, 2, -5);
    createTree(blockPlane, 18, 2, -5);
    
    // WALL 1: BLOCK LEFT SIDE - Must move RIGHT
    createTree(blockPlane, -20, 2, -25);
    createTree(blockPlane, -18, 2, -30);
    createTree(blockPlane, -16, 2, -35);
    createBush(blockPlane, -19, 2, -40);
    createTree(blockPlane, -17, 2, -45);
    createTree(blockPlane, -19, 2, -50);
    // Decoration rocks
    createBush(blockPlane, -12, 2, -30);
    createBush(blockPlane, -14, 2, -45);
    
    // WALL 2: BLOCK RIGHT SIDE - Must move LEFT
    createTree(blockPlane, 20, 2, -65);
    createTree(blockPlane, 18, 2, -70);
    createTree(blockPlane, 16, 2, -75);
    createBush(blockPlane, 19, 2, -80);
    createTree(blockPlane, 17, 2, -85);
    createTree(blockPlane, 19, 2, -90);
    // Decoration rocks
    createBush(blockPlane, 12, 2, -70);
    createBush(blockPlane, 14, 2, -85);
    
    // WALL 3: BLOCK LEFT SIDE - Must move RIGHT
    createTree(blockPlane, -20, 2, -105);
    createTree(blockPlane, -18, 2, -110);
    createTree(blockPlane, -16, 2, -115);
    createBush(blockPlane, -19, 2, -120);
    createTree(blockPlane, -17, 2, -125);
    createTree(blockPlane, -19, 2, -130);
    // Decoration rocks
    createBush(blockPlane, -12, 2, -110);
    createBush(blockPlane, -14, 2, -125);
    
    // WALL 4: BLOCK RIGHT SIDE - Must move LEFT
    createTree(blockPlane, 20, 2, -145);
    createTree(blockPlane, 18, 2, -150);
    createTree(blockPlane, 16, 2, -155);
    createBush(blockPlane, 19, 2, -160);
    createTree(blockPlane, 17, 2, -165);
    createTree(blockPlane, 19, 2, -170);
    // Decoration rocks
    createBush(blockPlane, 12, 2, -150);
    createBush(blockPlane, 14, 2, -165);
    
    // WALL 5: BLOCK LEFT SIDE - Must move RIGHT
    createTree(blockPlane, -20, 2, -185);
    createTree(blockPlane, -18, 2, -190);
    createTree(blockPlane, -16, 2, -195);
    createBush(blockPlane, -19, 2, -200);
    createTree(blockPlane, -17, 2, -205);
    createTree(blockPlane, -19, 2, -210);
    // Decoration rocks
    createBush(blockPlane, -12, 2, -190);
    createBush(blockPlane, -14, 2, -205);
    
    // WALL 6: BLOCK RIGHT SIDE - Must move LEFT
    createTree(blockPlane, 20, 2, -225);
    createTree(blockPlane, 18, 2, -230);
    createTree(blockPlane, 16, 2, -235);
    // Decoration rocks
    createBush(blockPlane, 12, 2, -230);
    
    // FINISH - Wide open exit
    createTree(blockPlane, -18, 2, -245);
    createTree(blockPlane, 18, 2, -245);
    
    // now add physics for all obstacles
    const obstaclePhysicsData = [
        // starting area
        { x: -18, y: 3, z: -10, w: 4, h: 6, d: 4 },
        { x: 18, y: 3, z: -10, w: 4, h: 6, d: 4 },
        // section 1
        { x: -18, y: 3, z: -50, w: 4, h: 6, d: 4 },
        { x: 18, y: 3, z: -55, w: 4, h: 6, d: 4 },
        { x: -5, y: 3, z: -60, w: 4, h: 6, d: 4 },
        // section 2
        { x: -18, y: 3, z: -90, w: 4, h: 6, d: 4 },
        { x: 6, y: 3, z: -95, w: 4, h: 6, d: 4 },
        { x: 18, y: 3, z: -105, w: 4, h: 6, d: 4 },
        // section 3
        { x: -18, y: 3, z: -125, w: 4, h: 6, d: 4 },
        { x: 18, y: 3, z: -130, w: 4, h: 6, d: 4 },
        { x: -7, y: 3, z: -140, w: 4, h: 6, d: 4 },
        // section 4
        { x: -18, y: 3, z: -165, w: 4, h: 6, d: 4 },
        { x: 18, y: 3, z: -170, w: 4, h: 6, d: 4 },
        { x: 5, y: 3, z: -180, w: 4, h: 6, d: 4 },
        // section 5
        { x: -18, y: 3, z: -210, w: 4, h: 6, d: 4 },
        { x: -6, y: 3, z: -215, w: 4, h: 6, d: 4 },
        { x: 18, y: 3, z: -220, w: 4, h: 6, d: 4 },
        // section 6
        { x: -20, y: 3, z: -260, w: 4, h: 6, d: 4 },
        { x: 20, y: 3, z: -260, w: 4, h: 6, d: 4 }
    ];
    
    obstaclePhysicsData.forEach(obs => {
        let obstacleShape = new Ammo.btBoxShape(new Ammo.btVector3(obs.w*0.5, obs.h*0.5, obs.d*0.5));
        obstacleShape.setMargin(0.05);
        let obstacleTransform = new Ammo.btTransform();
        obstacleTransform.setIdentity();
        obstacleTransform.setOrigin(new Ammo.btVector3(obs.x, obs.y, obs.z));
        compoundShape.addChildShape(obstacleTransform, obstacleShape);
    });
    
    // create finish line at the end
    let finishMesh = new THREE.Mesh(
        new THREE.BoxGeometry(30, 0.5, 5),
        new THREE.MeshPhongMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.3
        })
    );
    finishMesh.position.set(0, 1.5, -248); // near end of 500-unit platform
    finishMesh.userData.originalColor = 0xffff00;
    blockPlane.add(finishMesh);
    finishLine = finishMesh;

    // physics body for platform+obstacles
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    let motionState = new Ammo.btDefaultMotionState(transform);

    let localInertia = new Ammo.btVector3(0,0,0);
    compoundShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, compoundShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(body);

    body.setCollisionFlags(body.getCollisionFlags() | 2); 
    body.setActivationState(4); 

    body.setFriction(1.5);
    body.setRestitution(0.2);


    window.blockMesh = blockPlane;
    window.blockBody = body;
}


function createBall()
{
    let pos = {x: 0, y: 20, z: 0};
    let radius = 2;
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 1.0;

    //threeJS Section
    let ball = new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshPhongMaterial({color: 0xff0505}));

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

    body.setRestitution(0.2);
    body.setFriction(0.7);
    body.setDamping(0.05, 0.1);
    body.setRollingFriction(0.05);
    body.setCcdMotionThreshold(1);
    body.setCcdSweptSphereRadius(0.2 * radius);
    
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
    
    checkCollisions();
}

// visual effect when ball hits obstacles
function checkCollisions() {
    if (rigidBodies.length === 0) return;
    
    const ball = rigidBodies[0];
    const ballPos = ball.position;
    const collisionDistance = 5;
    
    // check obstacle collisions
    obstacles.forEach(obstacle => {
        const obstacleWorldPos = new THREE.Vector3();
        obstacle.getWorldPosition(obstacleWorldPos);
        const distance = ballPos.distanceTo(obstacleWorldPos);
        
        // flash white+yellow when ball is close
        if (distance < collisionDistance) {
            obstacle.material.emissive.setHex(0xffff00);
            obstacle.material.color.setHex(0xffffff);
            
            setTimeout(() => {
                obstacle.material.emissive.setHex(0x000000);
                obstacle.material.color.setHex(obstacle.userData.originalColor);
            }, 300);
        }
    });
    
    // check if ball reached finish line
    if (finishLine && !isGameOver) {
        const finishWorldPos = new THREE.Vector3();
        finishLine.getWorldPosition(finishWorldPos);
        const distanceToFinish = ballPos.distanceTo(finishWorldPos);
        
        if (distanceToFinish < 8) {
            // player wins!
            finishLine.material.emissiveIntensity = 1.0;
            console.log("You reached the finish line!");
            setTimeout(() => {
                finishLine.material.emissiveIntensity = 0.3;
            }, 500);
        }
    }
}


function updateBlockTilt(dt) {
    if (!window.blockMesh || !window.blockBody) return;

    const tiltSpeed = 2.0;
    const returnSpeed = 2.5;
    const maxTilt = Math.PI / 10; 

    let targetX = 0;
    let targetZ = 0;

    if (keys.up)    targetX -= maxTilt;
    if (keys.down)  targetX += maxTilt;
    if (keys.left)  targetZ += maxTilt;
    if (keys.right) targetZ -= maxTilt;

    let speedX = (keys.up || keys.down) ? tiltSpeed : returnSpeed;
    let speedZ = (keys.left || keys.right) ? tiltSpeed : returnSpeed;

    let tX = Math.min(1, speedX * dt);
    let tZ = Math.min(1, speedZ * dt);

    blockMesh.rotation.x = THREE.MathUtils.lerp(blockMesh.rotation.x, targetX, tX);
    blockMesh.rotation.z = THREE.MathUtils.lerp(blockMesh.rotation.z, targetZ, tZ);

    blockMesh.rotation.x = THREE.MathUtils.clamp(blockMesh.rotation.x, -maxTilt, maxTilt);
    blockMesh.rotation.z = THREE.MathUtils.clamp(blockMesh.rotation.z, -maxTilt, maxTilt);

    try {
        window.blockBody.activate();
    } catch (err) {
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
    //check if ball fell below platform or way past the end
    if (ball.position.y < -50 || ball.position.z < -280) 
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

// create racing barrier obstacle
function createBarrier(parent, x, y, z, rotation = 0) {
    const group = new THREE.Group();
    
    // striped barrier
    const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(8, 2, 1),
        new THREE.MeshPhongMaterial({ 
            color: 0xff0000,
            flatShading: true
        })
    );
    barrier.position.set(0, 1, 0);
    barrier.castShadow = true;
    barrier.userData.originalColor = 0xff0000;
    group.add(barrier);
    obstacles.push(barrier);
    
    // white stripe
    const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 0.5, 1.1),
        new THREE.MeshPhongMaterial({ color: 0xffffff })
    );
    stripe.position.set(0, 1, 0);
    stripe.castShadow = true;
    stripe.userData.originalColor = 0xffffff;
    group.add(stripe);
    obstacles.push(stripe);
    
    group.position.set(x, y, z);
    group.rotation.y = rotation;
    parent.add(group);
}

// create tire stack obstacle
function createTireStack(parent, x, y, z) {
    const group = new THREE.Group();
    const tireColor = 0x1a1a1a;
    
    for (let i = 0; i < 3; i++) {
        const tire = new THREE.Mesh(
            new THREE.TorusGeometry(1.2, 0.5, 8, 12),
            new THREE.MeshPhongMaterial({ color: tireColor })
        );
        tire.position.set(0, 0.5 + i * 1, 0);
        tire.rotation.x = Math.PI / 2;
        tire.castShadow = true;
        tire.userData.originalColor = tireColor;
        group.add(tire);
        obstacles.push(tire);
    }
    
    group.position.set(x, y, z);
    parent.add(group);
}

// create checkpoint arch
function createCheckpoint(parent, x, y, z, color) {
    const group = new THREE.Group();
    
    // left pillar
    const leftPillar = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 8, 1.5),
        new THREE.MeshPhongMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.3
        })
    );
    leftPillar.position.set(-8, 4, 0);
    leftPillar.castShadow = true;
    leftPillar.userData.originalColor = color;
    group.add(leftPillar);
    obstacles.push(leftPillar);
    
    // right pillar
    const rightPillar = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 8, 1.5),
        new THREE.MeshPhongMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.3
        })
    );
    rightPillar.position.set(8, 4, 0);
    rightPillar.castShadow = true;
    rightPillar.userData.originalColor = color;
    group.add(rightPillar);
    obstacles.push(rightPillar);
    
    // top arch
    const arch = new THREE.Mesh(
        new THREE.BoxGeometry(16, 1.5, 1.5),
        new THREE.MeshPhongMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.4
        })
    );
    arch.position.set(0, 8, 0);
    arch.castShadow = true;
    arch.userData.originalColor = color;
    group.add(arch);
    obstacles.push(arch);
    
    group.position.set(x, y, z);
    parent.add(group);
}

// create cone obstacle
function createCone(parent, x, y, z) {
    const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1, 3, 8),
        new THREE.MeshPhongMaterial({ 
            color: 0xff6600,
            flatShading: true
        })
    );
    cone.position.set(x, y + 1.5, z);
    cone.castShadow = true;
    cone.userData.originalColor = 0xff6600;
    parent.add(cone);
    obstacles.push(cone);
    
    // white stripe
    const stripe = new THREE.Mesh(
        new THREE.ConeGeometry(1.05, 1, 8),
        new THREE.MeshPhongMaterial({ color: 0xffffff })
    );
    stripe.position.set(x, y + 2, z);
    stripe.castShadow = true;
    stripe.userData.originalColor = 0xffffff;
    parent.add(stripe);
    obstacles.push(stripe);
}

// create fantasy tree
function createTree(parent, x, y, z) {
    const group = new THREE.Group();
    
    // Brown trunk
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1, 8, 8),
        new THREE.MeshPhongMaterial({ color: 0x4a2511 })
    );
    trunk.position.set(0, 4, 0);
    trunk.castShadow = true;
    trunk.userData.originalColor = 0x4a2511;
    group.add(trunk);
    obstacles.push(trunk);
    
    // Green foliage - bottom layer
    const foliage1 = new THREE.Mesh(
        new THREE.ConeGeometry(3.5, 5, 8),
        new THREE.MeshPhongMaterial({ color: 0x228B22 })
    );
    foliage1.position.set(0, 9, 0);
    foliage1.castShadow = true;
    foliage1.userData.originalColor = 0x228B22;
    group.add(foliage1);
    obstacles.push(foliage1);
    
    // Green foliage - middle layer
    const foliage2 = new THREE.Mesh(
        new THREE.ConeGeometry(2.8, 4, 8),
        new THREE.MeshPhongMaterial({ color: 0x2E8B57 })
    );
    foliage2.position.set(0, 12, 0);
    foliage2.castShadow = true;
    foliage2.userData.originalColor = 0x2E8B57;
    group.add(foliage2);
    obstacles.push(foliage2);
    
    // Green foliage - top
    const foliage3 = new THREE.Mesh(
        new THREE.ConeGeometry(2, 3, 8),
        new THREE.MeshPhongMaterial({ color: 0x32CD32 })
    );
    foliage3.position.set(0, 14.5, 0);
    foliage3.castShadow = true;
    foliage3.userData.originalColor = 0x32CD32;
    group.add(foliage3);
    obstacles.push(foliage3);
    
    group.position.set(x, y, z);
    parent.add(group);
}

// create bush
function createBush(parent, x, y, z) {
    const group = new THREE.Group();
    
    // Main bush sphere
    const bush = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 8, 8),
        new THREE.MeshPhongMaterial({ color: 0x228B22 })
    );
    bush.position.set(0, 1.5, 0);
    bush.castShadow = true;
    bush.userData.originalColor = 0x228B22;
    group.add(bush);
    obstacles.push(bush);
    
    // Additional bush clusters
    const bush2 = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 8, 8),
        new THREE.MeshPhongMaterial({ color: 0x2E8B57 })
    );
    bush2.position.set(1, 1.2, 0.5);
    bush2.castShadow = true;
    bush2.userData.originalColor = 0x2E8B57;
    group.add(bush2);
    obstacles.push(bush2);
    
    const bush3 = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 8),
        new THREE.MeshPhongMaterial({ color: 0x3CB371 })
    );
    bush3.position.set(-0.8, 1, -0.5);
    bush3.castShadow = true;
    bush3.userData.originalColor = 0x3CB371;
    group.add(bush3);
    obstacles.push(bush3);
    
    group.position.set(x, y, z);
    parent.add(group);
}

// create colorful stylized obstacle
function createSimpleObstacle(parent, x, y, z, color) {
    const group = new THREE.Group();
    
    // main body - cylinder
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 6, 8),
        new THREE.MeshPhongMaterial({ 
            color: color,
            flatShading: true
        })
    );
    body.position.set(0, 3, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData.originalColor = color;
    group.add(body);
    obstacles.push(body);
    
    // top piece
    const top = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 8, 8),
        new THREE.MeshPhongMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.3
        })
    );
    top.position.set(0, 6.5, 0);
    top.castShadow = true;
    top.userData.originalColor = color;
    group.add(top);
    obstacles.push(top);
    
    group.position.set(x, y, z);
    parent.add(group);
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

    // reset obstacles back to original color
    obstacles.forEach(obstacle => {
        if (obstacle.material) {
            obstacle.material.color.setHex(obstacle.userData.originalColor);
        }
    });

    //Create a new ball
    createBall();
}


